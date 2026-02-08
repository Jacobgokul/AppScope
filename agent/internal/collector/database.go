package collector

import (
	"database/sql"
	"fmt"
	"time"

	_ "github.com/lib/pq"
)

type DatabaseCollector struct {
	dbType   string
	connStr  string
	host     string
	port     int
	user     string
	password string
	dbname   string
	db       *sql.DB
}

func NewDatabaseCollector(dbType, host string, port int, user, password, dbname string) (*DatabaseCollector, error) {
	var connStr string

	switch dbType {
	case "postgres", "postgresql":
		connStr = fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=disable",
			host, port, user, password, dbname)
	case "mysql":
		// MySQL: user:password@tcp(host:port)/dbname
		connStr = fmt.Sprintf("%s:%s@tcp(%s:%d)/%s", user, password, host, port, dbname)
	case "mongodb", "mongo":
		// MongoDB: mongodb://user:password@host:port/dbname
		connStr = fmt.Sprintf("mongodb://%s:%s@%s:%d/%s", user, password, host, port, dbname)
	case "redis":
		// Redis: redis://user:password@host:port/db
		connStr = fmt.Sprintf("redis://%s:%s@%s:%d/0", user, password, host, port)
	default:
		return nil, fmt.Errorf("unsupported database type: %s", dbType)
	}

	return &DatabaseCollector{
		dbType:   dbType,
		connStr:  connStr,
		host:     host,
		port:     port,
		user:     user,
		password: password,
		dbname:   dbname,
	}, nil
}

func (c *DatabaseCollector) Connect() error {
	db, err := sql.Open("postgres", c.connStr)
	if err != nil {
		return err
	}

	// B19: Configure connection pool to prevent leaks
	db.SetMaxOpenConns(5)           // Max 5 open connections
	db.SetMaxIdleConns(2)            // Max 2 idle connections
	db.SetConnMaxLifetime(5 * time.Minute) // Connections expire after 5 minutes

	c.db = db
	return db.Ping()
}

func (c *DatabaseCollector) Close() {
	if c.db != nil {
		c.db.Close()
	}
}

func (c *DatabaseCollector) Collect() ([]Metric, error) {
	if c.db == nil {
		if err := c.Connect(); err != nil {
			return nil, err
		}
	}

	switch c.dbType {
	case "postgres", "postgresql":
		return c.collectPostgres()
	case "mysql":
		return c.collectMySQL()
	case "mongodb", "mongo":
		return c.collectMongoDB()
	case "redis":
		return c.collectRedis()
	default:
		return nil, fmt.Errorf("unsupported database type: %s", c.dbType)
	}
}

// collectPostgres collects PostgreSQL metrics
func (c *DatabaseCollector) collectPostgres() ([]Metric, error) {
	var metrics []Metric
	now := time.Now().UTC()

	// Active connections
	var activeConns int
	err := c.db.QueryRow("SELECT count(*) FROM pg_stat_activity WHERE state = 'active'").Scan(&activeConns)
	if err == nil {
		metrics = append(metrics, Metric{
			Timestamp:  now,
			MetricType: "db_connections",
			MetricName: "active",
			Source:     "postgres",
			Value:      float64(activeConns),
			Unit:       "count",
		})
	}

	// Total connections
	var totalConns int
	err = c.db.QueryRow("SELECT count(*) FROM pg_stat_activity").Scan(&totalConns)
	if err == nil {
		metrics = append(metrics, Metric{
			Timestamp:  now,
			MetricType: "db_connections",
			MetricName: "total",
			Source:     "postgres",
			Value:      float64(totalConns),
			Unit:       "count",
		})
	}

	// Max connections
	var maxConns int
	err = c.db.QueryRow("SHOW max_connections").Scan(&maxConns)
	if err == nil {
		metrics = append(metrics, Metric{
			Timestamp:  now,
			MetricType: "db_connections",
			MetricName: "max",
			Source:     "postgres",
			Value:      float64(maxConns),
			Unit:       "count",
		})
	}

	// Database size
	var dbSize int64
	err = c.db.QueryRow("SELECT pg_database_size(current_database())").Scan(&dbSize)
	if err == nil {
		metrics = append(metrics, Metric{
			Timestamp:  now,
			MetricType: "db_size",
			MetricName: "bytes",
			Source:     "postgres",
			Value:      float64(dbSize),
			Unit:       "bytes",
		})
	}

	// Transaction rate (commits + rollbacks per second)
	var xactCommit, xactRollback int64
	err = c.db.QueryRow("SELECT xact_commit, xact_rollback FROM pg_stat_database WHERE datname = current_database()").Scan(&xactCommit, &xactRollback)
	if err == nil {
		metrics = append(metrics, Metric{
			Timestamp:  now,
			MetricType: "db_transactions",
			MetricName: "commits",
			Source:     "postgres",
			Value:      float64(xactCommit),
			Unit:       "count",
		})
		metrics = append(metrics, Metric{
			Timestamp:  now,
			MetricType: "db_transactions",
			MetricName: "rollbacks",
			Source:     "postgres",
			Value:      float64(xactRollback),
			Unit:       "count",
		})
	}

	// Cache hit ratio
	var blksHit, blksRead int64
	err = c.db.QueryRow("SELECT sum(blks_hit) as hits, sum(blks_read) as reads FROM pg_stat_database WHERE datname = current_database()").Scan(&blksHit, &blksRead)
	if err == nil && (blksHit+blksRead) > 0 {
		cacheHitRatio := float64(blksHit) / float64(blksHit+blksRead) * 100.0
		metrics = append(metrics, Metric{
			Timestamp:  now,
			MetricType: "db_cache",
			MetricName: "hit_ratio",
			Source:     "postgres",
			Value:      cacheHitRatio,
			Unit:       "percent",
		})
	}

	// Slow queries (if pg_stat_statements is available)
	var slowQueries int
	err = c.db.QueryRow(`
		SELECT count(*) FROM pg_stat_statements
		WHERE mean_exec_time > 1000
	`).Scan(&slowQueries)
	if err == nil {
		metrics = append(metrics, Metric{
			Timestamp:  now,
			MetricType: "db_queries",
			MetricName: "slow_count",
			Source:     "postgres",
			Value:      float64(slowQueries),
			Unit:       "count",
		})
	}

	// Deadlocks
	var deadlocks int64
	err = c.db.QueryRow("SELECT deadlocks FROM pg_stat_database WHERE datname = current_database()").Scan(&deadlocks)
	if err == nil {
		metrics = append(metrics, Metric{
			Timestamp:  now,
			MetricType: "db_locks",
			MetricName: "deadlocks",
			Source:     "postgres",
			Value:      float64(deadlocks),
			Unit:       "count",
		})
	}

	return metrics, nil
}

// collectMySQL collects MySQL metrics (stub for future implementation)
func (c *DatabaseCollector) collectMySQL() ([]Metric, error) {
	var metrics []Metric
	now := time.Now().UTC()

	// TODO: Implement MySQL metrics collection
	// Example queries:
	// - SHOW STATUS LIKE 'Threads_connected'
	// - SHOW STATUS LIKE 'Slow_queries'
	// - SELECT SUM(data_length + index_length) FROM information_schema.tables WHERE table_schema = DATABASE()

	// For now, return basic connectivity metric
	metrics = append(metrics, Metric{
		Timestamp:  now,
		MetricType: "db_status",
		MetricName: "connected",
		Source:     "mysql",
		Value:      1.0,
		Unit:       "boolean",
	})

	return metrics, nil
}

// collectMongoDB collects MongoDB metrics (stub for future implementation)
func (c *DatabaseCollector) collectMongoDB() ([]Metric, error) {
	var metrics []Metric
	now := time.Now().UTC()

	// TODO: Implement MongoDB metrics collection using mongo-driver
	// Example commands:
	// - db.serverStatus()
	// - db.stats()
	// - db.currentOp()

	// For now, return basic connectivity metric
	metrics = append(metrics, Metric{
		Timestamp:  now,
		MetricType: "db_status",
		MetricName: "connected",
		Source:     "mongodb",
		Value:      1.0,
		Unit:       "boolean",
	})

	return metrics, nil
}

// collectRedis collects Redis metrics (stub for future implementation)
func (c *DatabaseCollector) collectRedis() ([]Metric, error) {
	var metrics []Metric
	now := time.Now().UTC()

	// TODO: Implement Redis metrics collection using go-redis
	// Example commands:
	// - INFO stats
	// - INFO memory
	// - DBSIZE

	// For now, return basic connectivity metric
	metrics = append(metrics, Metric{
		Timestamp:  now,
		MetricType: "db_status",
		MetricName: "connected",
		Source:     "redis",
		Value:      1.0,
		Unit:       "boolean",
	})

	return metrics, nil
}
