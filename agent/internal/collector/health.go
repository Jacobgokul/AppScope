package collector

import (
	"fmt"
	"net"
	"net/http"
	"time"
)

// HealthCollector performs health checks on services
type HealthCollector struct {
	checks []HealthCheck
}

// HealthCheck represents a single health check configuration
type HealthCheck struct {
	Name     string
	Type     string // "http", "tcp", "ping"
	Target   string // URL or host:port
	Timeout  time.Duration
	Interval time.Duration
}

// HealthStatus represents the result of a health check
type HealthStatus struct {
	Name           string
	Status         string    // "healthy", "degraded", "unhealthy"
	ResponseTimeMs int       // Response time in milliseconds
	Message        string    // Additional information
	CheckedAt      time.Time
}

// NewHealthCollector creates a new health check collector
func NewHealthCollector(checks []HealthCheck) *HealthCollector {
	// Set default timeout and interval if not specified
	for i := range checks {
		if checks[i].Timeout == 0 {
			checks[i].Timeout = 5 * time.Second
		}
		if checks[i].Interval == 0 {
			checks[i].Interval = 30 * time.Second
		}
	}

	return &HealthCollector{
		checks: checks,
	}
}

// Collect performs all configured health checks
func (c *HealthCollector) Collect() ([]Metric, error) {
	var metrics []Metric
	now := time.Now().UTC()

	for _, check := range c.checks {
		status := c.performCheck(check)

		// Convert health status to metrics
		statusValue := 1.0
		if status.Status == "degraded" {
			statusValue = 0.5
		} else if status.Status == "unhealthy" {
			statusValue = 0.0
		}

		metrics = append(metrics, Metric{
			Timestamp:  now,
			MetricType: "service_health",
			MetricName: "status",
			Source:     check.Name,
			Value:      statusValue,
			Unit:       "status",
			Tags: map[string]string{
				"check_type": check.Type,
				"target":     check.Target,
			},
		})

		metrics = append(metrics, Metric{
			Timestamp:  now,
			MetricType: "service_health",
			MetricName: "response_time_ms",
			Source:     check.Name,
			Value:      float64(status.ResponseTimeMs),
			Unit:       "milliseconds",
			Tags: map[string]string{
				"check_type": check.Type,
				"target":     check.Target,
			},
		})
	}

	return metrics, nil
}

// performCheck executes a single health check
func (c *HealthCollector) performCheck(check HealthCheck) HealthStatus {
	startTime := time.Now()

	var status HealthStatus
	status.Name = check.Name
	status.CheckedAt = startTime

	switch check.Type {
	case "http", "https":
		status = c.checkHTTP(check, startTime)
	case "tcp":
		status = c.checkTCP(check, startTime)
	default:
		status.Status = "unhealthy"
		status.Message = fmt.Sprintf("unknown check type: %s", check.Type)
	}

	return status
}

// checkHTTP performs an HTTP health check
func (c *HealthCollector) checkHTTP(check HealthCheck, startTime time.Time) HealthStatus {
	status := HealthStatus{
		Name:      check.Name,
		CheckedAt: startTime,
	}

	client := &http.Client{
		Timeout: check.Timeout,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			// Don't follow redirects for health checks
			return http.ErrUseLastResponse
		},
	}

	resp, err := client.Get(check.Target)
	responseTime := time.Since(startTime)
	status.ResponseTimeMs = int(responseTime.Milliseconds())

	if err != nil {
		status.Status = "unhealthy"
		status.Message = fmt.Sprintf("HTTP request failed: %v", err)
		return status
	}
	defer resp.Body.Close()

	// Consider 2xx and 3xx as healthy, 4xx as degraded, 5xx as unhealthy
	if resp.StatusCode >= 200 && resp.StatusCode < 400 {
		status.Status = "healthy"
		status.Message = fmt.Sprintf("HTTP %d", resp.StatusCode)
	} else if resp.StatusCode >= 400 && resp.StatusCode < 500 {
		status.Status = "degraded"
		status.Message = fmt.Sprintf("HTTP %d (client error)", resp.StatusCode)
	} else {
		status.Status = "unhealthy"
		status.Message = fmt.Sprintf("HTTP %d (server error)", resp.StatusCode)
	}

	return status
}

// checkTCP performs a TCP port health check
func (c *HealthCollector) checkTCP(check HealthCheck, startTime time.Time) HealthStatus {
	status := HealthStatus{
		Name:      check.Name,
		CheckedAt: startTime,
	}

	conn, err := net.DialTimeout("tcp", check.Target, check.Timeout)
	responseTime := time.Since(startTime)
	status.ResponseTimeMs = int(responseTime.Milliseconds())

	if err != nil {
		status.Status = "unhealthy"
		status.Message = fmt.Sprintf("TCP connection failed: %v", err)
		return status
	}

	conn.Close()

	status.Status = "healthy"
	status.Message = "TCP connection successful"

	return status
}

// AddCheck adds a new health check to the collector
func (c *HealthCollector) AddCheck(check HealthCheck) {
	c.checks = append(c.checks, check)
}

// RemoveCheck removes a health check by name
func (c *HealthCollector) RemoveCheck(name string) {
	for i, check := range c.checks {
		if check.Name == name {
			c.checks = append(c.checks[:i], c.checks[i+1:]...)
			return
		}
	}
}

// GetChecks returns all configured health checks
func (c *HealthCollector) GetChecks() []HealthCheck {
	return c.checks
}
