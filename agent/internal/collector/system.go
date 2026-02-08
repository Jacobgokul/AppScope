package collector

import (
	"time"

	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/disk"
	"github.com/shirou/gopsutil/v3/mem"
	"github.com/shirou/gopsutil/v3/net"
)

type SystemCollector struct {
	lastNetStats map[string]net.IOCountersStat
	lastNetTime  time.Time
}

type Metric struct {
	Timestamp  time.Time         `json:"timestamp"`
	MetricType string            `json:"metric_type"`
	MetricName string            `json:"metric_name"`
	Source     string            `json:"source,omitempty"`
	Value      float64           `json:"value"`
	Unit       string            `json:"unit,omitempty"`
	Tags       map[string]string `json:"tags,omitempty"`
}

func NewSystemCollector() *SystemCollector {
	return &SystemCollector{
		lastNetStats: make(map[string]net.IOCountersStat),
		lastNetTime:  time.Now(),
	}
}

func (c *SystemCollector) Collect() ([]Metric, error) {
	var metrics []Metric
	now := time.Now().UTC()

	// CPU
	cpuPercent, err := cpu.Percent(time.Second, false)
	if err == nil && len(cpuPercent) > 0 {
		metrics = append(metrics, Metric{
			Timestamp:  now,
			MetricType: "system",
			MetricName: "cpu_usage",
			Source:     "system",
			Value:      cpuPercent[0],
			Unit:       "percent",
		})
	}

	// Memory
	memInfo, err := mem.VirtualMemory()
	if err == nil {
		metrics = append(metrics, Metric{
			Timestamp:  now,
			MetricType: "system",
			MetricName: "memory_usage",
			Source:     "system",
			Value:      memInfo.UsedPercent,
			Unit:       "percent",
		})
		metrics = append(metrics, Metric{
			Timestamp:  now,
			MetricType: "system",
			MetricName: "memory_used_bytes",
			Source:     "system",
			Value:      float64(memInfo.Used),
			Unit:       "bytes",
		})
		metrics = append(metrics, Metric{
			Timestamp:  now,
			MetricType: "system",
			MetricName: "memory_available_bytes",
			Source:     "system",
			Value:      float64(memInfo.Available),
			Unit:       "bytes",
		})
	}

	// Disk
	diskInfo, err := disk.Usage("/")
	if err == nil {
		metrics = append(metrics, Metric{
			Timestamp:  now,
			MetricType: "system",
			MetricName: "disk_usage",
			Source:     "system",
			Value:      diskInfo.UsedPercent,
			Unit:       "percent",
			Tags:       map[string]string{"path": "/"},
		})
		metrics = append(metrics, Metric{
			Timestamp:  now,
			MetricType: "system",
			MetricName: "disk_used_bytes",
			Source:     "system",
			Value:      float64(diskInfo.Used),
			Unit:       "bytes",
			Tags:       map[string]string{"path": "/"},
		})
		metrics = append(metrics, Metric{
			Timestamp:  now,
			MetricType: "system",
			MetricName: "disk_total_bytes",
			Source:     "system",
			Value:      float64(diskInfo.Total),
			Unit:       "bytes",
			Tags:       map[string]string{"path": "/"},
		})
	}

	// Network I/O
	netMetrics := c.collectNetworkMetrics(now)
	metrics = append(metrics, netMetrics...)

	return metrics, nil
}

// collectNetworkMetrics collects network I/O statistics
func (c *SystemCollector) collectNetworkMetrics(now time.Time) []Metric {
	var metrics []Metric

	// Get network I/O counters per interface
	netStats, err := net.IOCounters(true)
	if err != nil {
		return metrics
	}

	currentTime := time.Now()
	timeDelta := currentTime.Sub(c.lastNetTime).Seconds()

	// Only calculate rates if we have previous data and enough time has passed
	if len(c.lastNetStats) > 0 && timeDelta > 0 {
		for _, stat := range netStats {
			// Skip loopback and inactive interfaces
			if stat.Name == "lo" || stat.Name == "lo0" {
				continue
			}

			lastStat, exists := c.lastNetStats[stat.Name]
			if !exists {
				continue
			}

			// Calculate bytes/sec rates
			bytesSentRate := float64(stat.BytesSent-lastStat.BytesSent) / timeDelta
			bytesRecvRate := float64(stat.BytesRecv-lastStat.BytesRecv) / timeDelta

			// Calculate packets/sec rates
			packetsSentRate := float64(stat.PacketsSent-lastStat.PacketsSent) / timeDelta
			packetsRecvRate := float64(stat.PacketsRecv-lastStat.PacketsRecv) / timeDelta

			metrics = append(metrics, Metric{
				Timestamp:  now,
				MetricType: "network",
				MetricName: "network_out",
				Source:     "system",
				Value:      bytesSentRate,
				Unit:       "bytes/sec",
				Tags:       map[string]string{"interface": stat.Name},
			})

			metrics = append(metrics, Metric{
				Timestamp:  now,
				MetricType: "network",
				MetricName: "network_in",
				Source:     "system",
				Value:      bytesRecvRate,
				Unit:       "bytes/sec",
				Tags:       map[string]string{"interface": stat.Name},
			})

			metrics = append(metrics, Metric{
				Timestamp:  now,
				MetricType: "network",
				MetricName: "packets_sent_per_sec",
				Source:     "system",
				Value:      packetsSentRate,
				Unit:       "packets/sec",
				Tags:       map[string]string{"interface": stat.Name},
			})

			metrics = append(metrics, Metric{
				Timestamp:  now,
				MetricType: "network",
				MetricName: "packets_recv_per_sec",
				Source:     "system",
				Value:      packetsRecvRate,
				Unit:       "packets/sec",
				Tags:       map[string]string{"interface": stat.Name},
			})

			// Error counters
			if stat.Errin > lastStat.Errin || stat.Errout > lastStat.Errout {
				metrics = append(metrics, Metric{
					Timestamp:  now,
					MetricType: "network",
					MetricName: "errors_in",
					Source:     "system",
					Value:      float64(stat.Errin),
					Unit:       "count",
					Tags:       map[string]string{"interface": stat.Name},
				})

				metrics = append(metrics, Metric{
					Timestamp:  now,
					MetricType: "network",
					MetricName: "errors_out",
					Source:     "system",
					Value:      float64(stat.Errout),
					Unit:       "count",
					Tags:       map[string]string{"interface": stat.Name},
				})
			}

			// Drop counters
			if stat.Dropin > lastStat.Dropin || stat.Dropout > lastStat.Dropout {
				metrics = append(metrics, Metric{
					Timestamp:  now,
					MetricType: "network",
					MetricName: "drops_in",
					Source:     "system",
					Value:      float64(stat.Dropin),
					Unit:       "count",
					Tags:       map[string]string{"interface": stat.Name},
				})

				metrics = append(metrics, Metric{
					Timestamp:  now,
					MetricType: "network",
					MetricName: "drops_out",
					Source:     "system",
					Value:      float64(stat.Dropout),
					Unit:       "count",
					Tags:       map[string]string{"interface": stat.Name},
				})
			}
		}
	}

	// Update last stats
	c.lastNetStats = make(map[string]net.IOCountersStat)
	for _, stat := range netStats {
		c.lastNetStats[stat.Name] = stat
	}
	c.lastNetTime = currentTime

	return metrics
}
