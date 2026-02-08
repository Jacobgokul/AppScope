package collector

import (
	"bufio"
	"log"
	"os"
	"regexp"
	"strings"
	"time"
)

type LogCollector struct {
	paths              []string
	offsets            map[string]int64
	patterns           *LogPatterns
	parser             *LogParser
	startFromBeginning bool
}

type LogPatterns struct {
	Error   *regexp.Regexp
	Warn    *regexp.Regexp
	Info    *regexp.Regexp
	HTTPLog *regexp.Regexp
	JSONLog *regexp.Regexp
}

type LogEvent struct {
	Timestamp      time.Time         `json:"timestamp"`
	Level          string            `json:"level"`
	Source         string            `json:"source,omitempty"`
	Service        string            `json:"service,omitempty"`
	Message        string            `json:"message"`
	StackTrace     string            `json:"stack_trace,omitempty"`
	HTTPMethod     string            `json:"http_method,omitempty"`
	HTTPPath       string            `json:"http_path,omitempty"`
	HTTPStatus     int               `json:"http_status,omitempty"`
	ResponseTimeMs int               `json:"response_time_ms,omitempty"`
	Metadata       map[string]string `json:"metadata,omitempty"`
}

func NewLogCollector(paths []string) *LogCollector {
	return &LogCollector{
		paths:              paths,
		offsets:            make(map[string]int64),
		startFromBeginning: false, // B20: Default to starting from end
		parser:             NewLogParser(),
		patterns: &LogPatterns{
			Error:   regexp.MustCompile(`(?i)(error|exception|fatal|critical|panic)`),
			Warn:    regexp.MustCompile(`(?i)(warn|warning)`),
			Info:    regexp.MustCompile(`(?i)(info)`),
			HTTPLog: regexp.MustCompile(`"(GET|POST|PUT|DELETE|PATCH)\s+([^"]+)"\s+(\d+)`),
		},
	}
}

// NewLogCollectorWithConfig creates a log collector with custom configuration
func NewLogCollectorWithConfig(paths []string, startFromBeginning bool) *LogCollector {
	return &LogCollector{
		paths:              paths,
		offsets:            make(map[string]int64),
		startFromBeginning: startFromBeginning,
		parser:             NewLogParser(),
		patterns: &LogPatterns{
			Error:   regexp.MustCompile(`(?i)(error|exception|fatal|critical|panic)`),
			Warn:    regexp.MustCompile(`(?i)(warn|warning)`),
			Info:    regexp.MustCompile(`(?i)(info)`),
			HTTPLog: regexp.MustCompile(`"(GET|POST|PUT|DELETE|PATCH)\s+([^"]+)"\s+(\d+)`),
		},
	}
}

func (c *LogCollector) Collect() ([]LogEvent, error) {
	var events []LogEvent

	for _, path := range c.paths {
		fileEvents, err := c.collectFromFile(path)
		if err != nil {
			continue // Skip files that can't be read
		}
		events = append(events, fileEvents...)
	}

	return events, nil
}

func (c *LogCollector) collectFromFile(path string) ([]LogEvent, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	stat, err := file.Stat()
	if err != nil {
		return nil, err
	}
	currentSize := stat.Size()

	// Get current offset or initialize
	offset, exists := c.offsets[path]
	if !exists {
		// B20: First run - start from beginning or end based on config
		if c.startFromBeginning {
			offset = 0
		} else {
			// Default: start from end of file on first run
			offset = currentSize
			c.offsets[path] = offset
			return nil, nil
		}
	}

	// B28: Detect log rotation - file size is less than offset
	if currentSize < offset {
		log.Printf("[INFO] Log rotation detected for %s (size: %d < offset: %d), resetting offset to 0", path, currentSize, offset)
		offset = 0
	}

	// Seek to last position
	_, err = file.Seek(offset, 0)
	if err != nil {
		return nil, err
	}

	var events []LogEvent
	scanner := bufio.NewScanner(file)
	newOffset := offset

	for scanner.Scan() {
		line := scanner.Text()
		newOffset += int64(len(line)) + 1 // +1 for newline

		event := c.parseLine(line, path)
		if event != nil {
			events = append(events, *event)
		}
	}

	c.offsets[path] = newOffset
	return events, nil
}

func (c *LogCollector) parseLine(line, source string) *LogEvent {
	if len(strings.TrimSpace(line)) == 0 {
		return nil
	}

	// Use the advanced parser for format detection and parsing
	event := c.parser.ParseLine(line, source)
	if event == nil {
		return nil
	}

	// Try to extract response time if not already set
	if event.ResponseTimeMs == 0 {
		if responseTime, ok := c.parser.ExtractResponseTime(line); ok {
			event.ResponseTimeMs = responseTime
		}
	}

	return event
}
