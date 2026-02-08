package main

import (
	"flag"
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/appscope/agent/internal/collector"
	"github.com/appscope/agent/internal/config"
	"github.com/appscope/agent/internal/health"
	"github.com/appscope/agent/internal/transport"
)

var Version = "1.0.0"

func main() {
	configPath := flag.String("config", "/etc/appscope/config.yaml", "Path to config file")
	version := flag.Bool("version", false, "Print version and exit")
	flag.Parse()

	if *version {
		fmt.Printf("AppScope Agent v%s\n", Version)
		os.Exit(0)
	}

	// Load config
	cfg, err := config.Load(*configPath)
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	log.Printf("[INFO] AppScope Agent v%s starting...", Version)
	log.Printf("[INFO] Service name: %s", cfg.ServiceName)
	log.Printf("[INFO] Server URL: %s", cfg.ServerURL)

	// B35: Start health endpoint
	healthServer := health.NewHealthServer(cfg.HealthPort, cfg.ServiceName)
	if err := healthServer.Start(); err != nil {
		log.Printf("[WARN] Failed to start health endpoint: %v", err)
	}

	// Create transport client
	client := transport.NewClient(cfg.ServerURL, cfg.APIKey, cfg.ServiceName)

	// Validate API key
	log.Println("[INFO] Validating API key...")
	if err := client.ValidateAPIKey(); err != nil {
		log.Fatalf("[ERROR] API key validation failed: %v\n\nTroubleshooting:\n  1. Verify 'api_key' in config.yaml is correct\n  2. Ensure 'server_url' is reachable: %s\n  3. Check network connectivity\n  4. Verify firewall rules allow outbound HTTPS", err, cfg.ServerURL)
	}
	log.Println("[INFO] API key validated successfully")

	// Create collectors
	var systemCollector *collector.SystemCollector
	var logCollector *collector.LogCollector
	var dbCollector *collector.DatabaseCollector

	if cfg.SystemMetrics {
		systemCollector = collector.NewSystemCollector()
		healthServer.RegisterCollector("system")
		log.Println("[INFO] System metrics collector enabled")
	}

	if len(cfg.Logs) > 0 {
		logCollector = collector.NewLogCollectorWithConfig(cfg.Logs, cfg.StartFromBeginning)
		healthServer.RegisterCollector("logs")
		log.Printf("[INFO] Log collector enabled for %d files (start_from_beginning: %v)", len(cfg.Logs), cfg.StartFromBeginning)
	}

	if cfg.Database.Host != "" {
		var err error
		dbCollector, err = collector.NewDatabaseCollector(
			cfg.Database.Type,
			cfg.Database.Host,
			cfg.Database.Port,
			cfg.Database.User,
			cfg.Database.Password,
			cfg.Database.DBName,
		)
		if err != nil {
			log.Printf("[WARN] Failed to create database collector: %v", err)
			healthServer.RegisterCollector("database")
			healthServer.DisableCollector("database")
		} else {
			if err := dbCollector.Connect(); err != nil {
				log.Printf("[WARN] Failed to connect to database: %v", err)
				healthServer.RegisterCollector("database")
				healthServer.UpdateCollectorError("database", err)
			} else {
				healthServer.RegisterCollector("database")
				log.Println("[INFO] Database collector enabled")
			}
		}
	}

	// Setup graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	// Collection ticker
	ticker := time.NewTicker(time.Duration(cfg.CollectionInterval) * time.Second)
	defer ticker.Stop()

	log.Printf("[INFO] Starting collection loop (interval: %ds)", cfg.CollectionInterval)

	// Cleanup function
	cleanup := func() {
		log.Println("[INFO] Cleaning up resources...")
		if dbCollector != nil {
			dbCollector.Close()
		}
		ticker.Stop()
	}

	for {
		select {
		case <-ticker.C:
			collect(client, healthServer, systemCollector, logCollector, dbCollector)
		case sig := <-sigChan:
			log.Printf("[INFO] Received signal %v, shutting down gracefully...", sig)
			cleanup()
			os.Exit(0)
		}
	}
}

func collect(client *transport.Client, healthServer *health.HealthServer, sys *collector.SystemCollector, logs *collector.LogCollector, db *collector.DatabaseCollector) {
	var allMetrics []interface{}
	var allLogs []interface{}

	// Collect system metrics with error recovery
	if sys != nil {
		metrics, err := sys.Collect()
		if err != nil {
			log.Printf("[ERROR] System collection failed: %v", err)
			healthServer.UpdateCollectorError("system", err)
		} else {
			for _, m := range metrics {
				allMetrics = append(allMetrics, m)
			}
			healthServer.UpdateCollectorSuccess("system", len(metrics))
		}
	}

	// Collect database metrics with error recovery
	if db != nil {
		metrics, err := db.Collect()
		if err != nil {
			log.Printf("[ERROR] Database collection failed: %v", err)
			healthServer.UpdateCollectorError("database", err)
			// Try to reconnect on error
			if reconnectErr := db.Connect(); reconnectErr != nil {
				log.Printf("[WARN] Database reconnection failed: %v", reconnectErr)
			} else {
				log.Println("[INFO] Database reconnected successfully")
			}
		} else {
			for _, m := range metrics {
				allMetrics = append(allMetrics, m)
			}
			healthServer.UpdateCollectorSuccess("database", len(metrics))
		}
	}

	// Collect logs with error recovery
	if logs != nil {
		events, err := logs.Collect()
		if err != nil {
			log.Printf("[ERROR] Log collection failed: %v", err)
			healthServer.UpdateCollectorError("logs", err)
		} else {
			for _, e := range events {
				allLogs = append(allLogs, e)
			}
			healthServer.UpdateCollectorSuccess("logs", len(events))
		}
	}

	// Send data with retry logic
	if len(allMetrics) > 0 {
		if err := client.SendMetrics(allMetrics); err != nil {
			log.Printf("[ERROR] Failed to send metrics: %v", err)
		} else {
			log.Printf("[INFO] Sent %d metrics", len(allMetrics))
		}
	}

	if len(allLogs) > 0 {
		if err := client.SendLogs(allLogs); err != nil {
			log.Printf("[ERROR] Failed to send logs: %v", err)
		} else {
			log.Printf("[INFO] Sent %d log events", len(allLogs))
		}
	}
}
