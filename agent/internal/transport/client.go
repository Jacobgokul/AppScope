package transport

import (
	"bytes"
	"compress/gzip"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"
)

type Client struct {
	serverURL      string
	apiKey         string
	serviceName    string
	httpClient     *http.Client
	enableGzip     bool
	maxPayloadSize int // Maximum payload size before compression
}

type MetricBatch struct {
	ServiceName string        `json:"service_name"`
	Metrics     []interface{} `json:"metrics"`
}

type LogBatch struct {
	ServiceName string        `json:"service_name"`
	Logs        []interface{} `json:"logs"`
}

func NewClient(serverURL, apiKey, serviceName string) *Client {
	return &Client{
		serverURL:      serverURL,
		apiKey:         apiKey,
		serviceName:    serviceName,
		enableGzip:     true,          // Enable gzip compression by default
		maxPayloadSize: 1024,          // Compress if payload > 1KB
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
			Transport: &http.Transport{
				MaxIdleConns:        10,
				MaxIdleConnsPerHost: 5,
				IdleConnTimeout:     90 * time.Second,
				DisableCompression:  false, // Enable compression
			},
		},
	}
}

func (c *Client) SendMetrics(metrics []interface{}) error {
	batch := MetricBatch{
		ServiceName: c.serviceName,
		Metrics:     metrics,
	}
	return c.postWithRetry("/api/v1/ingest/metrics", batch)
}

func (c *Client) SendLogs(logs []interface{}) error {
	batch := LogBatch{
		ServiceName: c.serviceName,
		Logs:        logs,
	}
	return c.postWithRetry("/api/v1/ingest/logs", batch)
}

// postWithRetry sends POST request with exponential backoff retry logic
func (c *Client) postWithRetry(path string, payload interface{}) error {
	maxRetries := 3
	retryDelays := []time.Duration{1 * time.Second, 2 * time.Second, 4 * time.Second}

	var lastErr error
	for attempt := 0; attempt <= maxRetries; attempt++ {
		if attempt > 0 {
			delay := retryDelays[attempt-1]
			log.Printf("[INFO] Retry attempt %d/%d after %v", attempt, maxRetries, delay)
			time.Sleep(delay)
		}

		err := c.post(path, payload)
		if err == nil {
			return nil
		}

		lastErr = err

		// Check if error is retryable
		if !c.isRetryable(err) {
			// Don't retry on 4xx errors
			return err
		}
	}

	return fmt.Errorf("failed after %d retries: %w", maxRetries, lastErr)
}

// isRetryable determines if an error should trigger a retry
func (c *Client) isRetryable(err error) bool {
	// Network errors are retryable
	if err != nil {
		errStr := err.Error()
		// Check if it's a 4xx error (client errors - not retryable)
		if contains(errStr, "server returned error: 4") {
			return false
		}
		// 5xx errors and network errors are retryable
		return true
	}
	return false
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && s[:len(substr)] == substr ||
		   len(s) > len(substr) && stringContains(s, substr)
}

func stringContains(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

func (c *Client) post(path string, payload interface{}) error {
	data, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal payload: %w", err)
	}

	// Compress payload if gzip is enabled and payload is large enough
	var body io.Reader
	var compressed bool

	if c.enableGzip && len(data) > c.maxPayloadSize {
		var buf bytes.Buffer
		gzipWriter := gzip.NewWriter(&buf)

		if _, err := gzipWriter.Write(data); err != nil {
			gzipWriter.Close()
			return fmt.Errorf("failed to compress payload: %w", err)
		}

		if err := gzipWriter.Close(); err != nil {
			return fmt.Errorf("failed to close gzip writer: %w", err)
		}

		body = &buf
		compressed = true

		log.Printf("[DEBUG] Compressed payload from %d to %d bytes (%.1f%% reduction)",
			len(data), buf.Len(), float64(len(data)-buf.Len())/float64(len(data))*100)
	} else {
		body = bytes.NewBuffer(data)
	}

	url := c.serverURL + path
	req, err := http.NewRequest("POST", url, body)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.apiKey)

	if compressed {
		req.Header.Set("Content-Encoding", "gzip")
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send request to %s: %w (check network connectivity and server URL)", url, err)
	}
	defer func() {
		// B9 Fix: Drain response body before close to prevent connection leaks
		io.Copy(io.Discard, resp.Body)
		if closeErr := resp.Body.Close(); closeErr != nil {
			// Log but don't return error as main operation may have succeeded
			log.Printf("Warning: failed to close response body: %v\n", closeErr)
		}
	}()

	if resp.StatusCode >= 400 {
		// Try to read error message from response body
		body, readErr := io.ReadAll(resp.Body)
		errorMsg := ""
		if readErr == nil {
			errorMsg = string(body)
		}

		// Provide helpful context based on status code
		switch resp.StatusCode {
		case 400:
			return fmt.Errorf("bad request (400): server rejected the data format. Error: %s", errorMsg)
		case 401:
			return fmt.Errorf("unauthorized (401): invalid API key. Please check your api_key in config.yaml. Error: %s", errorMsg)
		case 403:
			return fmt.Errorf("forbidden (403): API key is valid but lacks permissions. Error: %s", errorMsg)
		case 404:
			return fmt.Errorf("not found (404): endpoint %s does not exist. Check server_url in config.yaml. Error: %s", url, errorMsg)
		case 429:
			return fmt.Errorf("rate limited (429): too many requests. Error: %s", errorMsg)
		case 500, 502, 503, 504:
			return fmt.Errorf("server error (%d): the AppScope server is experiencing issues. Error: %s", resp.StatusCode, errorMsg)
		default:
			return fmt.Errorf("server returned error %d: %s", resp.StatusCode, errorMsg)
		}
	}

	return nil
}

func (c *Client) ValidateAPIKey() error {
	// Simple validation by checking if we can send an empty batch
	return c.post("/api/v1/ingest/metrics", MetricBatch{
		ServiceName: c.serviceName,
		Metrics:     []interface{}{},
	})
}
