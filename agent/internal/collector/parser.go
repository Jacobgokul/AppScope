package collector

import (
	"encoding/json"
	"regexp"
	"strconv"
	"strings"
	"time"
)

// LogFormat represents different log formats
type LogFormat int

const (
	FormatUnknown LogFormat = iota
	FormatJSON
	FormatApache
	FormatNginx
	FormatCommonLog
	FormatCombinedLog
	FormatSyslog
)

// LogParser handles parsing of different log formats
type LogParser struct {
	jsonRegex     *regexp.Regexp
	apacheRegex   *regexp.Regexp
	nginxRegex    *regexp.Regexp
	syslogRegex   *regexp.Regexp
	timestampRegex *regexp.Regexp
	levelRegex    *regexp.Regexp
}

// NewLogParser creates a new log parser with pre-compiled regex patterns
func NewLogParser() *LogParser {
	return &LogParser{
		// JSON detection (simple check for opening brace)
		jsonRegex: regexp.MustCompile(`^\s*\{.*\}\s*$`),

		// Apache Common Log Format: 127.0.0.1 - - [10/Oct/2000:13:55:36 -0700] "GET /apache_pb.gif HTTP/1.0" 200 2326
		apacheRegex: regexp.MustCompile(`^(\S+) (\S+) (\S+) \[([^\]]+)\] "([^"]*)" (\d+) (\S+)`),

		// Nginx Combined Log Format: similar to Apache but with referrer and user-agent
		nginxRegex: regexp.MustCompile(`^(\S+) - (\S+) \[([^\]]+)\] "([^"]*)" (\d+) (\d+) "([^"]*)" "([^"]*)"`),

		// Syslog format: Jan 12 14:20:15 hostname appname[pid]: message
		syslogRegex: regexp.MustCompile(`^(\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})\s+(\S+)\s+(\S+?)(?:\[(\d+)\])?:\s+(.*)$`),

		// Generic timestamp patterns (ISO8601, RFC3339, common formats)
		timestampRegex: regexp.MustCompile(`(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d{3,6})?(?:Z|[+-]\d{2}:?\d{2})?)`),

		// Log level detection
		levelRegex: regexp.MustCompile(`(?i)\b(TRACE|DEBUG|INFO|WARN(?:ING)?|ERROR|FATAL|CRITICAL|PANIC)\b`),
	}
}

// DetectFormat attempts to detect the log format of a line
func (p *LogParser) DetectFormat(line string) LogFormat {
	line = strings.TrimSpace(line)

	if len(line) == 0 {
		return FormatUnknown
	}

	// Check for JSON
	if p.jsonRegex.MatchString(line) {
		return FormatJSON
	}

	// Check for Nginx (more specific than Apache)
	if p.nginxRegex.MatchString(line) {
		return FormatNginx
	}

	// Check for Apache
	if p.apacheRegex.MatchString(line) {
		return FormatApache
	}

	// Check for Syslog
	if p.syslogRegex.MatchString(line) {
		return FormatSyslog
	}

	// Default to common log if nothing matches
	return FormatCommonLog
}

// ParseLine parses a log line according to its detected format
func (p *LogParser) ParseLine(line, source string) *LogEvent {
	if len(strings.TrimSpace(line)) == 0 {
		return nil
	}

	format := p.DetectFormat(line)

	switch format {
	case FormatJSON:
		return p.parseJSON(line, source)
	case FormatApache:
		return p.parseApache(line, source)
	case FormatNginx:
		return p.parseNginx(line, source)
	case FormatSyslog:
		return p.parseSyslog(line, source)
	default:
		return p.parseCommon(line, source)
	}
}

// parseJSON parses JSON formatted logs
func (p *LogParser) parseJSON(line, source string) *LogEvent {
	var data map[string]interface{}

	if err := json.Unmarshal([]byte(line), &data); err != nil {
		// Not valid JSON, fall back to common parsing
		return p.parseCommon(line, source)
	}

	event := &LogEvent{
		Timestamp: time.Now().UTC(),
		Source:    source,
		Message:   line,
		Level:     "info",
		Metadata:  make(map[string]string),
	}

	// Extract common JSON fields
	if timestamp, ok := data["timestamp"].(string); ok {
		if ts, err := time.Parse(time.RFC3339, timestamp); err == nil {
			event.Timestamp = ts
		}
	} else if ts, ok := data["time"].(string); ok {
		if parsed, err := time.Parse(time.RFC3339, ts); err == nil {
			event.Timestamp = parsed
		}
	}

	// Extract level
	if level, ok := data["level"].(string); ok {
		event.Level = strings.ToLower(level)
	} else if lvl, ok := data["severity"].(string); ok {
		event.Level = strings.ToLower(lvl)
	}

	// Extract message
	if msg, ok := data["message"].(string); ok {
		event.Message = msg
	} else if msg, ok := data["msg"].(string); ok {
		event.Message = msg
	}

	// Extract service/component
	if service, ok := data["service"].(string); ok {
		event.Service = service
	} else if component, ok := data["component"].(string); ok {
		event.Service = component
	}

	// Extract HTTP fields
	if method, ok := data["http_method"].(string); ok {
		event.HTTPMethod = method
	}
	if path, ok := data["http_path"].(string); ok {
		event.HTTPPath = path
	}
	if status, ok := data["http_status"].(float64); ok {
		event.HTTPStatus = int(status)
	}
	if responseTime, ok := data["response_time"].(float64); ok {
		event.ResponseTimeMs = int(responseTime)
	} else if duration, ok := data["duration_ms"].(float64); ok {
		event.ResponseTimeMs = int(duration)
	}

	// Extract stack trace
	if stack, ok := data["stack"].(string); ok {
		event.StackTrace = stack
	} else if trace, ok := data["stack_trace"].(string); ok {
		event.StackTrace = trace
	}

	// Store other fields in metadata
	for key, value := range data {
		if key != "timestamp" && key != "time" && key != "level" && key != "message" && key != "msg" {
			if strValue, ok := value.(string); ok {
				event.Metadata[key] = strValue
			}
		}
	}

	return event
}

// parseApache parses Apache Common Log Format
func (p *LogParser) parseApache(line, source string) *LogEvent {
	matches := p.apacheRegex.FindStringSubmatch(line)
	if matches == nil {
		return p.parseCommon(line, source)
	}

	event := &LogEvent{
		Timestamp: time.Now().UTC(),
		Source:    source,
		Message:   line,
		Level:     "info",
		Metadata:  make(map[string]string),
	}

	// matches[1] = IP address
	// matches[4] = timestamp
	// matches[5] = request (method + path)
	// matches[6] = status code
	// matches[7] = size

	// Parse timestamp: [10/Oct/2000:13:55:36 -0700]
	if ts, err := time.Parse("02/Jan/2006:15:04:05 -0700", matches[4]); err == nil {
		event.Timestamp = ts
	}

	// Parse request line
	requestParts := strings.Fields(matches[5])
	if len(requestParts) >= 2 {
		event.HTTPMethod = requestParts[0]
		event.HTTPPath = requestParts[1]
	}

	// Parse status code
	if status, err := strconv.Atoi(matches[6]); err == nil {
		event.HTTPStatus = status

		// Set level based on status code
		if status >= 500 {
			event.Level = "error"
		} else if status >= 400 {
			event.Level = "warn"
		}
	}

	event.Metadata["client_ip"] = matches[1]
	event.Metadata["bytes_sent"] = matches[7]

	return event
}

// parseNginx parses Nginx Combined Log Format
func (p *LogParser) parseNginx(line, source string) *LogEvent {
	matches := p.nginxRegex.FindStringSubmatch(line)
	if matches == nil {
		return p.parseCommon(line, source)
	}

	event := &LogEvent{
		Timestamp: time.Now().UTC(),
		Source:    source,
		Message:   line,
		Level:     "info",
		Metadata:  make(map[string]string),
	}

	// matches[1] = IP address
	// matches[3] = timestamp
	// matches[4] = request
	// matches[5] = status code
	// matches[6] = bytes sent
	// matches[7] = referrer
	// matches[8] = user agent

	// Parse timestamp
	if ts, err := time.Parse("02/Jan/2006:15:04:05 -0700", matches[3]); err == nil {
		event.Timestamp = ts
	}

	// Parse request
	requestParts := strings.Fields(matches[4])
	if len(requestParts) >= 2 {
		event.HTTPMethod = requestParts[0]
		event.HTTPPath = requestParts[1]
	}

	// Parse status code
	if status, err := strconv.Atoi(matches[5]); err == nil {
		event.HTTPStatus = status

		if status >= 500 {
			event.Level = "error"
		} else if status >= 400 {
			event.Level = "warn"
		}
	}

	event.Metadata["client_ip"] = matches[1]
	event.Metadata["bytes_sent"] = matches[6]
	event.Metadata["referrer"] = matches[7]
	event.Metadata["user_agent"] = matches[8]

	return event
}

// parseSyslog parses standard syslog format
func (p *LogParser) parseSyslog(line, source string) *LogEvent {
	matches := p.syslogRegex.FindStringSubmatch(line)
	if matches == nil {
		return p.parseCommon(line, source)
	}

	event := &LogEvent{
		Timestamp: time.Now().UTC(),
		Source:    source,
		Level:     "info",
		Metadata:  make(map[string]string),
	}

	// matches[1] = timestamp (no year)
	// matches[2] = hostname
	// matches[3] = process name
	// matches[4] = PID
	// matches[5] = message

	// Parse timestamp (syslog doesn't include year, use current year)
	currentYear := time.Now().Year()
	timestampStr := matches[1] + " " + strconv.Itoa(currentYear)
	if ts, err := time.Parse("Jan 2 15:04:05 2006", timestampStr); err == nil {
		event.Timestamp = ts
	}

	event.Service = matches[3]
	event.Message = matches[5]

	event.Metadata["hostname"] = matches[2]
	if matches[4] != "" {
		event.Metadata["pid"] = matches[4]
	}

	// Detect level from message
	if levelMatch := p.levelRegex.FindStringSubmatch(event.Message); levelMatch != nil {
		event.Level = strings.ToLower(levelMatch[1])
	}

	return event
}

// parseCommon parses generic/unknown log formats
func (p *LogParser) parseCommon(line, source string) *LogEvent {
	event := &LogEvent{
		Timestamp: time.Now().UTC(),
		Source:    source,
		Message:   line,
		Level:     "info",
	}

	// Try to extract timestamp
	if timestampMatch := p.timestampRegex.FindString(line); timestampMatch != "" {
		// Try multiple timestamp formats
		formats := []string{
			time.RFC3339,
			time.RFC3339Nano,
			"2006-01-02T15:04:05.000Z",
			"2006-01-02T15:04:05",
			"2006-01-02 15:04:05",
			"2006-01-02 15:04:05.000",
		}

		for _, format := range formats {
			if ts, err := time.Parse(format, timestampMatch); err == nil {
				event.Timestamp = ts
				break
			}
		}
	}

	// Detect log level
	if levelMatch := p.levelRegex.FindStringSubmatch(line); levelMatch != nil {
		event.Level = strings.ToLower(levelMatch[1])
		if event.Level == "warning" {
			event.Level = "warn"
		}
	}

	// Detect HTTP patterns in generic logs
	httpRegex := regexp.MustCompile(`"?(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\s+([^\s"]+).*?"?\s+(\d{3})`)
	if httpMatch := httpRegex.FindStringSubmatch(line); httpMatch != nil {
		event.HTTPMethod = httpMatch[1]
		event.HTTPPath = httpMatch[2]
		if status, err := strconv.Atoi(httpMatch[3]); err == nil {
			event.HTTPStatus = status
		}
	}

	return event
}

// ExtractResponseTime attempts to extract response time from a log line
func (p *LogParser) ExtractResponseTime(line string) (int, bool) {
	// Common patterns for response time
	patterns := []string{
		`response_time[=:]\s*(\d+(?:\.\d+)?)(?:ms)?`,
		`duration[=:]\s*(\d+(?:\.\d+)?)(?:ms)?`,
		`took\s+(\d+(?:\.\d+)?)(?:ms)?`,
		`(\d+(?:\.\d+)?)\s*ms`,
	}

	for _, pattern := range patterns {
		regex := regexp.MustCompile(pattern)
		if match := regex.FindStringSubmatch(line); match != nil {
			if timeMs, err := strconv.ParseFloat(match[1], 64); err == nil {
				return int(timeMs), true
			}
		}
	}

	return 0, false
}
