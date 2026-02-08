package health

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"
)

type HealthServer struct {
	port        int
	serviceName string
	startTime   time.Time
	collectors  map[string]*CollectorState
	mu          sync.RWMutex
}

type CollectorState struct {
	Name         string    `json:"name"`
	Status       string    `json:"status"`        // "running", "error", "disabled"
	LastSuccess  time.Time `json:"last_success"`
	LastError    string    `json:"last_error,omitempty"`
	LastErrorAt  time.Time `json:"last_error_at,omitempty"`
	MetricsCount int64     `json:"metrics_count"`
}

type HealthResponse struct {
	ServiceName string                     `json:"service_name"`
	Status      string                     `json:"status"` // "healthy", "degraded", "unhealthy"
	Uptime      string                     `json:"uptime"`
	UptimeMs    int64                      `json:"uptime_ms"`
	Collectors  map[string]*CollectorState `json:"collectors"`
	Timestamp   time.Time                  `json:"timestamp"`
}

func NewHealthServer(port int, serviceName string) *HealthServer {
	return &HealthServer{
		port:        port,
		serviceName: serviceName,
		startTime:   time.Now(),
		collectors:  make(map[string]*CollectorState),
	}
}

func (h *HealthServer) Start() error {
	http.HandleFunc("/health", h.healthHandler)

	addr := fmt.Sprintf(":%d", h.port)
	log.Printf("[INFO] Health endpoint started on http://localhost%s/health", addr)

	go func() {
		if err := http.ListenAndServe(addr, nil); err != nil {
			log.Printf("[ERROR] Health server error: %v", err)
		}
	}()

	return nil
}

func (h *HealthServer) healthHandler(w http.ResponseWriter, r *http.Request) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	uptime := time.Since(h.startTime)

	// Determine overall status
	status := "healthy"
	errorCount := 0
	disabledCount := 0

	for _, collector := range h.collectors {
		if collector.Status == "error" {
			errorCount++
		} else if collector.Status == "disabled" {
			disabledCount++
		}
	}

	totalCollectors := len(h.collectors)
	if errorCount > 0 && errorCount < totalCollectors {
		status = "degraded"
	} else if errorCount == totalCollectors && totalCollectors > 0 {
		status = "unhealthy"
	}

	response := HealthResponse{
		ServiceName: h.serviceName,
		Status:      status,
		Uptime:      uptime.String(),
		UptimeMs:    uptime.Milliseconds(),
		Collectors:  h.collectors,
		Timestamp:   time.Now().UTC(),
	}

	w.Header().Set("Content-Type", "application/json")

	// Set HTTP status code based on health
	httpStatus := http.StatusOK
	if status == "unhealthy" {
		httpStatus = http.StatusServiceUnavailable
	} else if status == "degraded" {
		httpStatus = http.StatusOK // Still return 200 for degraded
	}
	w.WriteHeader(httpStatus)

	json.NewEncoder(w).Encode(response)
}

// RegisterCollector registers a new collector for health monitoring
func (h *HealthServer) RegisterCollector(name string) {
	h.mu.Lock()
	defer h.mu.Unlock()

	h.collectors[name] = &CollectorState{
		Name:   name,
		Status: "running",
	}
}

// UpdateCollectorSuccess updates collector state on successful collection
func (h *HealthServer) UpdateCollectorSuccess(name string, metricsCount int) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if collector, exists := h.collectors[name]; exists {
		collector.Status = "running"
		collector.LastSuccess = time.Now().UTC()
		collector.MetricsCount += int64(metricsCount)
	}
}

// UpdateCollectorError updates collector state on error
func (h *HealthServer) UpdateCollectorError(name string, err error) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if collector, exists := h.collectors[name]; exists {
		collector.Status = "error"
		collector.LastError = err.Error()
		collector.LastErrorAt = time.Now().UTC()
	}
}

// DisableCollector marks a collector as disabled
func (h *HealthServer) DisableCollector(name string) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if collector, exists := h.collectors[name]; exists {
		collector.Status = "disabled"
	}
}
