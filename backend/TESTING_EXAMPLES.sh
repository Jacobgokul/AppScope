#!/bin/bash
# Testing Examples for Service Tracking Implementation
# Replace YOUR_API_KEY, YOUR_JWT_TOKEN, and PROJECT_ID with actual values

# Color codes for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:8000"

echo -e "${BLUE}=== Service Tracking API Testing Examples ===${NC}\n"

# Test 1: Ingest metrics without service_name (should create "default" service)
echo -e "${GREEN}Test 1: Ingest metrics without service_name${NC}"
curl -X POST "$BASE_URL/api/v1/ingest/metrics" \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "metrics": [
      {
        "metric_type": "cpu",
        "metric_name": "cpu_usage",
        "value": 45.5,
        "unit": "percent"
      },
      {
        "metric_type": "memory",
        "metric_name": "memory_usage",
        "value": 72.3,
        "unit": "percent"
      }
    ]
  }'
echo -e "\n\n"

# Test 2: Ingest metrics with service_name at batch level
echo -e "${GREEN}Test 2: Ingest metrics with service_name (backend-api)${NC}"
curl -X POST "$BASE_URL/api/v1/ingest/metrics" \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "service_name": "backend-api",
    "metrics": [
      {
        "metric_type": "http_requests",
        "metric_name": "requests_per_second",
        "value": 150.0,
        "unit": "count"
      },
      {
        "metric_type": "latency",
        "metric_name": "avg_response_time",
        "value": 45.2,
        "unit": "ms"
      }
    ]
  }'
echo -e "\n\n"

# Test 3: Ingest logs with service_name
echo -e "${GREEN}Test 3: Ingest logs with service_name (database)${NC}"
curl -X POST "$BASE_URL/api/v1/ingest/logs" \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "service_name": "database",
    "logs": [
      {
        "level": "error",
        "message": "Connection pool exhausted",
        "source": "/var/log/postgresql/postgresql.log"
      },
      {
        "level": "warn",
        "message": "Slow query detected (5.2s)",
        "source": "/var/log/postgresql/postgresql.log"
      }
    ]
  }'
echo -e "\n\n"

# Test 4: Ingest batch with mixed data
echo -e "${GREEN}Test 4: Ingest batch with both metrics and logs${NC}"
curl -X POST "$BASE_URL/api/v1/ingest/batch" \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "metrics": {
      "service_name": "web-server",
      "metrics": [
        {
          "metric_type": "cpu",
          "metric_name": "cpu_usage",
          "value": 65.0
        }
      ]
    },
    "logs": {
      "service_name": "web-server",
      "logs": [
        {
          "level": "info",
          "message": "Request processed successfully",
          "http_method": "GET",
          "http_path": "/api/users",
          "http_status": 200,
          "response_time_ms": 45
        }
      ]
    }
  }'
echo -e "\n\n"

# Test 5: Individual metric with service_name override
echo -e "${GREEN}Test 5: Individual metric overrides batch service_name${NC}"
curl -X POST "$BASE_URL/api/v1/ingest/metrics" \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "service_name": "default-service",
    "metrics": [
      {
        "metric_type": "cpu",
        "metric_name": "cpu_usage",
        "value": 45.0
      },
      {
        "metric_type": "memory",
        "metric_name": "memory_usage",
        "value": 70.0,
        "service_name": "special-service"
      }
    ]
  }'
echo -e "\n\n"

# Test 6: Multiple services for different microservices
echo -e "${GREEN}Test 6: Multiple services (microservices architecture)${NC}"

echo "  - Auth Service"
curl -X POST "$BASE_URL/api/v1/ingest/metrics" \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "service_name": "auth-service",
    "metrics": [
      {
        "metric_type": "http_requests",
        "metric_name": "login_attempts",
        "value": 25
      }
    ]
  }'
echo ""

echo "  - User Service"
curl -X POST "$BASE_URL/api/v1/ingest/metrics" \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "service_name": "user-service",
    "metrics": [
      {
        "metric_type": "db_connections",
        "metric_name": "active_connections",
        "value": 15
      }
    ]
  }'
echo ""

echo "  - Payment Service"
curl -X POST "$BASE_URL/api/v1/ingest/metrics" \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "service_name": "payment-service",
    "metrics": [
      {
        "metric_type": "transactions",
        "metric_name": "processed_payments",
        "value": 50
      }
    ]
  }'
echo -e "\n\n"

# Test 7: Check agent status
echo -e "${GREEN}Test 7: Check agent/service status${NC}"
curl -X GET "$BASE_URL/api/v1/projects/PROJECT_ID/agent-status" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
echo -e "\n\n"

# Test 8: Check project stats
echo -e "${GREEN}Test 8: Check project statistics${NC}"
curl -X GET "$BASE_URL/api/v1/projects/PROJECT_ID/stats" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
echo -e "\n\n"

echo -e "${BLUE}=== Testing Complete ===${NC}\n"
echo "Expected Results:"
echo "  - Multiple services should be created (default, backend-api, database, etc.)"
echo "  - Each service should have a last_heartbeat timestamp"
echo "  - Agent status endpoint should show all services with connection status"
echo "  - All services that just sent data should show as 'connected'"
echo ""
echo "Next Steps:"
echo "  1. Wait 2+ minutes and check agent status again (services should show as disconnected)"
echo "  2. Send new data to reconnect a service"
echo "  3. Check the dashboard to see service status UI"
