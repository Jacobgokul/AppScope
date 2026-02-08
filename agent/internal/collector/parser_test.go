package collector

import (
	"testing"
	"time"
)

func TestLogParser_DetectFormat(t *testing.T) {
	parser := NewLogParser()

	tests := []struct {
		name     string
		line     string
		expected LogFormat
	}{
		{
			name:     "JSON log",
			line:     `{"timestamp":"2024-01-27T10:30:00Z","level":"info","message":"test"}`,
			expected: FormatJSON,
		},
		{
			name:     "Apache Common Log",
			line:     `127.0.0.1 - - [10/Oct/2000:13:55:36 -0700] "GET /apache_pb.gif HTTP/1.0" 200 2326`,
			expected: FormatApache,
		},
		{
			name:     "Nginx Combined Log",
			line:     `192.168.1.1 - user [10/Oct/2000:13:55:36 -0700] "GET /index.html HTTP/1.1" 200 1234 "http://example.com" "Mozilla/5.0"`,
			expected: FormatNginx,
		},
		{
			name:     "Syslog format",
			line:     `Jan 12 14:20:15 hostname appname[1234]: This is a syslog message`,
			expected: FormatSyslog,
		},
		{
			name:     "Generic log",
			line:     `2024-01-27 10:30:00 INFO This is a generic log message`,
			expected: FormatCommonLog,
		},
		{
			name:     "Empty line",
			line:     ``,
			expected: FormatUnknown,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := parser.DetectFormat(tt.line)
			if result != tt.expected {
				t.Errorf("DetectFormat(%q) = %v, want %v", tt.line, result, tt.expected)
			}
		})
	}
}

func TestLogParser_ParseJSON(t *testing.T) {
	parser := NewLogParser()

	tests := []struct {
		name          string
		line          string
		expectedLevel string
		expectedMsg   string
	}{
		{
			name:          "Simple JSON",
			line:          `{"timestamp":"2024-01-27T10:30:00Z","level":"error","message":"test error"}`,
			expectedLevel: "error",
			expectedMsg:   "test error",
		},
		{
			name:          "JSON with msg field",
			line:          `{"time":"2024-01-27T10:30:00Z","level":"warn","msg":"warning message"}`,
			expectedLevel: "warn",
			expectedMsg:   "warning message",
		},
		{
			name:          "JSON with HTTP fields",
			line:          `{"timestamp":"2024-01-27T10:30:00Z","level":"info","message":"request","http_method":"GET","http_path":"/api/users","http_status":200}`,
			expectedLevel: "info",
			expectedMsg:   "request",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			event := parser.ParseLine(tt.line, "test.log")
			if event == nil {
				t.Fatal("ParseLine returned nil")
			}
			if event.Level != tt.expectedLevel {
				t.Errorf("Level = %q, want %q", event.Level, tt.expectedLevel)
			}
			if event.Message != tt.expectedMsg {
				t.Errorf("Message = %q, want %q", event.Message, tt.expectedMsg)
			}
		})
	}
}

func TestLogParser_ParseApache(t *testing.T) {
	parser := NewLogParser()

	line := `192.168.1.100 - - [27/Jan/2024:10:30:00 -0700] "GET /api/users HTTP/1.1" 200 1234`
	event := parser.ParseLine(line, "access.log")

	if event == nil {
		t.Fatal("ParseLine returned nil")
	}

	if event.HTTPMethod != "GET" {
		t.Errorf("HTTPMethod = %q, want %q", event.HTTPMethod, "GET")
	}

	if event.HTTPPath != "/api/users" {
		t.Errorf("HTTPPath = %q, want %q", event.HTTPPath, "/api/users")
	}

	if event.HTTPStatus != 200 {
		t.Errorf("HTTPStatus = %d, want %d", event.HTTPStatus, 200)
	}

	if event.Level != "info" {
		t.Errorf("Level = %q, want %q (status 200 should be info)", event.Level, "info")
	}

	if event.Metadata["client_ip"] != "192.168.1.100" {
		t.Errorf("client_ip = %q, want %q", event.Metadata["client_ip"], "192.168.1.100")
	}
}

func TestLogParser_ParseApache_ErrorStatus(t *testing.T) {
	parser := NewLogParser()

	tests := []struct {
		name          string
		line          string
		expectedLevel string
	}{
		{
			name:          "Server error (5xx)",
			line:          `192.168.1.100 - - [27/Jan/2024:10:30:00 -0700] "GET /api/users HTTP/1.1" 500 0`,
			expectedLevel: "error",
		},
		{
			name:          "Client error (4xx)",
			line:          `192.168.1.100 - - [27/Jan/2024:10:30:00 -0700] "GET /api/users HTTP/1.1" 404 0`,
			expectedLevel: "warn",
		},
		{
			name:          "Success (2xx)",
			line:          `192.168.1.100 - - [27/Jan/2024:10:30:00 -0700] "GET /api/users HTTP/1.1" 201 100`,
			expectedLevel: "info",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			event := parser.ParseLine(tt.line, "access.log")
			if event == nil {
				t.Fatal("ParseLine returned nil")
			}
			if event.Level != tt.expectedLevel {
				t.Errorf("Level = %q, want %q", event.Level, tt.expectedLevel)
			}
		})
	}
}

func TestLogParser_ParseNginx(t *testing.T) {
	parser := NewLogParser()

	line := `10.0.0.1 - john [27/Jan/2024:10:30:00 -0700] "POST /api/login HTTP/1.1" 200 512 "https://example.com/login" "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"`
	event := parser.ParseLine(line, "nginx-access.log")

	if event == nil {
		t.Fatal("ParseLine returned nil")
	}

	if event.HTTPMethod != "POST" {
		t.Errorf("HTTPMethod = %q, want %q", event.HTTPMethod, "POST")
	}

	if event.HTTPPath != "/api/login" {
		t.Errorf("HTTPPath = %q, want %q", event.HTTPPath, "/api/login")
	}

	if event.Metadata["referrer"] != "https://example.com/login" {
		t.Errorf("referrer = %q, want %q", event.Metadata["referrer"], "https://example.com/login")
	}

	if event.Metadata["user_agent"] != "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" {
		t.Errorf("user_agent = %q, want expected value", event.Metadata["user_agent"])
	}
}

func TestLogParser_ParseSyslog(t *testing.T) {
	parser := NewLogParser()

	line := `Jan 27 10:30:00 webserver nginx[12345]: This is an error message`
	event := parser.ParseLine(line, "syslog")

	if event == nil {
		t.Fatal("ParseLine returned nil")
	}

	if event.Service != "nginx" {
		t.Errorf("Service = %q, want %q", event.Service, "nginx")
	}

	if event.Message != "This is an error message" {
		t.Errorf("Message = %q, want %q", event.Message, "This is an error message")
	}

	if event.Metadata["hostname"] != "webserver" {
		t.Errorf("hostname = %q, want %q", event.Metadata["hostname"], "webserver")
	}

	if event.Metadata["pid"] != "12345" {
		t.Errorf("pid = %q, want %q", event.Metadata["pid"], "12345")
	}
}

func TestLogParser_ParseCommon(t *testing.T) {
	parser := NewLogParser()

	tests := []struct {
		name          string
		line          string
		expectedLevel string
	}{
		{
			name:          "Error log",
			line:          `2024-01-27 10:30:00 ERROR Database connection failed`,
			expectedLevel: "error",
		},
		{
			name:          "Warning log",
			line:          `2024-01-27 10:30:00 WARN Slow query detected`,
			expectedLevel: "warn",
		},
		{
			name:          "Info log",
			line:          `2024-01-27 10:30:00 INFO Application started`,
			expectedLevel: "info",
		},
		{
			name:          "Fatal log",
			line:          `2024-01-27 10:30:00 FATAL Critical system error`,
			expectedLevel: "fatal",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			event := parser.ParseLine(tt.line, "app.log")
			if event == nil {
				t.Fatal("ParseLine returned nil")
			}
			if event.Level != tt.expectedLevel {
				t.Errorf("Level = %q, want %q", event.Level, tt.expectedLevel)
			}
		})
	}
}

func TestLogParser_ExtractResponseTime(t *testing.T) {
	parser := NewLogParser()

	tests := []struct {
		name         string
		line         string
		expectFound  bool
		expectedTime int
	}{
		{
			name:         "Response time with ms",
			line:         `Request completed in 125ms`,
			expectFound:  true,
			expectedTime: 125,
		},
		{
			name:         "Response time without ms",
			line:         `Request completed in 250 ms`,
			expectFound:  true,
			expectedTime: 250,
		},
		{
			name:         "Duration field",
			line:         `{"duration":150,"status":"ok"}`,
			expectFound:  true,
			expectedTime: 150,
		},
		{
			name:         "Took pattern",
			line:         `Query took 75ms to execute`,
			expectFound:  true,
			expectedTime: 75,
		},
		{
			name:         "No response time",
			line:         `Simple log message`,
			expectFound:  false,
			expectedTime: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			time, found := parser.ExtractResponseTime(tt.line)
			if found != tt.expectFound {
				t.Errorf("found = %v, want %v", found, tt.expectFound)
			}
			if found && time != tt.expectedTime {
				t.Errorf("time = %d, want %d", time, tt.expectedTime)
			}
		})
	}
}

func TestLogParser_TimestampParsing(t *testing.T) {
	parser := NewLogParser()

	tests := []struct {
		name         string
		line         string
		expectRecent bool // Should timestamp be recent (not zero)
	}{
		{
			name:         "ISO8601 with timezone",
			line:         `2024-01-27T10:30:00Z INFO Test message`,
			expectRecent: true,
		},
		{
			name:         "ISO8601 without timezone",
			line:         `2024-01-27T10:30:00 INFO Test message`,
			expectRecent: true,
		},
		{
			name:         "Simple date time",
			line:         `2024-01-27 10:30:00 INFO Test message`,
			expectRecent: true,
		},
		{
			name:         "With milliseconds",
			line:         `2024-01-27 10:30:00.123 INFO Test message`,
			expectRecent: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			event := parser.ParseLine(tt.line, "test.log")
			if event == nil {
				t.Fatal("ParseLine returned nil")
			}

			// Check if timestamp was parsed (not just set to time.Now())
			// We can't check exact time, but we can verify it's not zero
			if tt.expectRecent && event.Timestamp.IsZero() {
				t.Error("Expected non-zero timestamp")
			}
		})
	}
}

func BenchmarkLogParser_ParseJSON(b *testing.B) {
	parser := NewLogParser()
	line := `{"timestamp":"2024-01-27T10:30:00Z","level":"error","message":"test error","service":"api"}`

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		parser.ParseLine(line, "test.log")
	}
}

func BenchmarkLogParser_ParseApache(b *testing.B) {
	parser := NewLogParser()
	line := `192.168.1.100 - - [27/Jan/2024:10:30:00 -0700] "GET /api/users HTTP/1.1" 200 1234`

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		parser.ParseLine(line, "access.log")
	}
}

func BenchmarkLogParser_DetectFormat(b *testing.B) {
	parser := NewLogParser()
	lines := []string{
		`{"timestamp":"2024-01-27T10:30:00Z","level":"info","message":"test"}`,
		`127.0.0.1 - - [10/Oct/2000:13:55:36 -0700] "GET /test HTTP/1.0" 200 2326`,
		`2024-01-27 10:30:00 INFO This is a log message`,
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		parser.DetectFormat(lines[i%len(lines)])
	}
}
