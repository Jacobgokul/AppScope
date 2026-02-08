package config

import (
	"fmt"
	"os"
	"strings"

	"gopkg.in/yaml.v3"
)

type Config struct {
	APIKey             string         `yaml:"api_key"`
	Project            string         `yaml:"project"`
	ServerURL          string         `yaml:"server_url"`
	ServiceName        string         `yaml:"service_name"`         // Identifies this service in multi-server deployments
	Logs               []string       `yaml:"logs"`
	Database           DatabaseConfig `yaml:"database"`
	SystemMetrics      bool           `yaml:"system_metrics"`
	CollectionInterval int            `yaml:"collection_interval"` // seconds
	StartFromBeginning bool           `yaml:"start_from_beginning"` // B20: Log collection start position
	HealthPort         int            `yaml:"health_port"`          // B35: Health endpoint port
}

type DatabaseConfig struct {
	Type        string `yaml:"type"` // postgres, mysql, etc.
	Host        string `yaml:"host"`
	Port        int    `yaml:"port"`
	User        string `yaml:"user"`
	Password    string `yaml:"password"`
	DBName      string `yaml:"dbname"`
	MetricsOnly bool   `yaml:"metrics_only"`
}

func Load(path string) (*Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	// Expand environment variables
	content := os.ExpandEnv(string(data))

	var cfg Config
	if err := yaml.Unmarshal([]byte(content), &cfg); err != nil {
		return nil, err
	}

	// Set defaults
	if cfg.ServerURL == "" {
		cfg.ServerURL = "https://api.appscope.io"
	}
	if cfg.CollectionInterval == 0 {
		cfg.CollectionInterval = 30
	}
	if cfg.HealthPort == 0 {
		cfg.HealthPort = 9090 // B35: Default health port
	}
	if cfg.ServiceName == "" {
		// Default service name to hostname if not specified
		hostname, err := os.Hostname()
		if err == nil {
			cfg.ServiceName = hostname
		} else {
			cfg.ServiceName = "unknown"
		}
	}

	// B5: Removed redundant env var expansion (lines 53-56)
	// Line 37 already handles all env vars via os.ExpandEnv()

	// B30: Validate API key format
	if err := ValidateAPIKey(cfg.APIKey); err != nil {
		return nil, fmt.Errorf("invalid API key: %w", err)
	}

	return &cfg, nil
}

// ValidateAPIKey validates the API key format
// B30: API keys must have prefix "ask_" and minimum length
func ValidateAPIKey(apiKey string) error {
	const (
		requiredPrefix = "ask_"
		minLength      = 20 // ask_ (4) + at least 16 characters
	)

	if apiKey == "" {
		return fmt.Errorf("API key is empty")
	}

	if !strings.HasPrefix(apiKey, requiredPrefix) {
		return fmt.Errorf("API key must start with '%s'", requiredPrefix)
	}

	if len(apiKey) < minLength {
		return fmt.Errorf("API key too short (minimum %d characters)", minLength)
	}

	return nil
}
