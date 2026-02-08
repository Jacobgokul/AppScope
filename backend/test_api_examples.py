"""
API Examples and Integration Tests

This file demonstrates how to use the AppScope API endpoints.
Can be used for manual testing or as a reference for API consumers.

Run with: python test_api_examples.py

NOTE: Requires a running backend server and valid credentials.
"""
import requests
import json
from datetime import datetime, timedelta

# Configuration
BASE_URL = "http://localhost:8000/api/v1"
TEST_EMAIL = "test@example.com"
TEST_PASSWORD = "testpassword123"


class AppScopeAPIClient:
    """Simple API client for testing AppScope endpoints."""

    def __init__(self, base_url: str):
        self.base_url = base_url
        self.token = None
        self.api_key = None
        self.project_id = None

    def login(self, email: str, password: str):
        """Authenticate and get JWT token."""
        response = requests.post(
            f"{self.base_url}/auth/login",
            json={"email": email, "password": password}
        )
        response.raise_for_status()
        data = response.json()
        self.token = data["access_token"]
        print(f"✓ Logged in as {email}")
        return data

    def _headers(self, use_api_key=False):
        """Get authorization headers."""
        if use_api_key:
            return {"Authorization": f"Bearer {self.api_key}"}
        return {"Authorization": f"Bearer {self.token}"}

    # ==================== Project Management ====================

    def create_project(self, name: str, description: str = None, environment: str = "production"):
        """Create a new project."""
        response = requests.post(
            f"{self.base_url}/projects",
            headers=self._headers(),
            json={
                "name": name,
                "description": description,
                "environment": environment
            }
        )
        response.raise_for_status()
        data = response.json()
        self.project_id = data["project"]["id"]
        self.api_key = data["api_key"]
        print(f"✓ Created project: {name} (ID: {self.project_id})")
        print(f"  API Key: {self.api_key[:20]}...")
        return data

    def list_projects(self, limit=50, offset=0):
        """List all projects."""
        response = requests.get(
            f"{self.base_url}/projects",
            headers=self._headers(),
            params={"limit": limit, "offset": offset}
        )
        response.raise_for_status()
        data = response.json()
        print(f"✓ Found {data['total']} projects")
        return data

    def get_project(self, project_id: str):
        """Get project details."""
        response = requests.get(
            f"{self.base_url}/projects/{project_id}",
            headers=self._headers()
        )
        response.raise_for_status()
        print(f"✓ Retrieved project {project_id}")
        return response.json()

    def update_project(self, project_id: str, **kwargs):
        """Update project settings."""
        response = requests.put(
            f"{self.base_url}/projects/{project_id}",
            headers=self._headers(),
            json=kwargs
        )
        response.raise_for_status()
        print(f"✓ Updated project {project_id}")
        return response.json()

    def regenerate_api_key(self, project_id: str):
        """Regenerate project API key."""
        response = requests.post(
            f"{self.base_url}/projects/{project_id}/api-keys/regenerate",
            headers=self._headers()
        )
        response.raise_for_status()
        data = response.json()
        self.api_key = data["api_key"]
        print(f"✓ Regenerated API key")
        print(f"  New Key: {self.api_key[:20]}...")
        return data

    def get_project_stats(self, project_id: str):
        """Get project statistics."""
        response = requests.get(
            f"{self.base_url}/projects/{project_id}/stats",
            headers=self._headers()
        )
        response.raise_for_status()
        data = response.json()
        print(f"✓ Project stats:")
        print(f"  Services: {data['stats']['services_count']}")
        print(f"  Metrics (24h): {data['stats']['metrics_24h']}")
        print(f"  Logs (24h): {data['stats']['logs_24h']}")
        print(f"  Errors (24h): {data['stats']['errors_24h']}")
        return data

    def delete_project(self, project_id: str):
        """Delete a project."""
        response = requests.delete(
            f"{self.base_url}/projects/{project_id}",
            headers=self._headers()
        )
        response.raise_for_status()
        print(f"✓ Deleted project {project_id}")

    # ==================== Service Configuration ====================

    def create_service(self, project_id: str, name: str, service_type: str,
                      description: str = None, config: dict = None):
        """Add a service to the project."""
        response = requests.post(
            f"{self.base_url}/projects/{project_id}/services",
            headers=self._headers(),
            json={
                "name": name,
                "service_type": service_type,
                "description": description,
                "config": config or {}
            }
        )
        response.raise_for_status()
        data = response.json()
        print(f"✓ Created service: {name} ({service_type})")
        return data

    def list_services(self, project_id: str):
        """List all services in a project."""
        response = requests.get(
            f"{self.base_url}/projects/{project_id}/services",
            headers=self._headers()
        )
        response.raise_for_status()
        data = response.json()
        print(f"✓ Found {data['total']} services")
        for svc in data["services"]:
            print(f"  - {svc['name']} ({svc['service_type']})")
        return data

    def update_service(self, project_id: str, service_id: str, **kwargs):
        """Update service configuration."""
        response = requests.put(
            f"{self.base_url}/projects/{project_id}/services/{service_id}",
            headers=self._headers(),
            json=kwargs
        )
        response.raise_for_status()
        print(f"✓ Updated service {service_id}")
        return response.json()

    def delete_service(self, project_id: str, service_id: str):
        """Delete a service."""
        response = requests.delete(
            f"{self.base_url}/projects/{project_id}/services/{service_id}",
            headers=self._headers()
        )
        response.raise_for_status()
        print(f"✓ Deleted service {service_id}")

    # ==================== Data Ingestion ====================

    def ingest_metrics(self, metrics: list):
        """Send metrics to the platform (uses API key auth)."""
        response = requests.post(
            f"{self.base_url}/ingest/metrics",
            headers=self._headers(use_api_key=True),
            json={"metrics": metrics}
        )
        response.raise_for_status()
        data = response.json()
        print(f"✓ Ingested {data['received']} metrics")
        return data

    def ingest_logs(self, logs: list):
        """Send logs to the platform (uses API key auth)."""
        response = requests.post(
            f"{self.base_url}/ingest/logs",
            headers=self._headers(use_api_key=True),
            json={"logs": logs}
        )
        response.raise_for_status()
        data = response.json()
        print(f"✓ Ingested {data['received']} logs")
        return data

    # ==================== Dashboard & Metrics ====================

    def get_metrics(self, project_id: str, metric_type: str = None,
                   start_time: datetime = None, end_time: datetime = None, limit: int = 100):
        """Get metrics for a project."""
        params = {"limit": limit}
        if metric_type:
            params["metric_type"] = metric_type
        if start_time:
            params["start_time"] = start_time.isoformat()
        if end_time:
            params["end_time"] = end_time.isoformat()

        response = requests.get(
            f"{self.base_url}/metrics/{project_id}",
            headers=self._headers(),
            params=params
        )
        response.raise_for_status()
        data = response.json()
        print(f"✓ Retrieved {data['total']} metrics")
        return data

    def get_metric_stats(self, project_id: str, service: str = None,
                        start_time: datetime = None, end_time: datetime = None):
        """Get aggregated statistics."""
        params = {}
        if service:
            params["service"] = service
        if start_time:
            params["start_time"] = start_time.isoformat()
        if end_time:
            params["end_time"] = end_time.isoformat()

        response = requests.get(
            f"{self.base_url}/metrics/{project_id}/stats",
            headers=self._headers(),
            params=params
        )
        response.raise_for_status()
        data = response.json()
        stats = data["stats"]
        print(f"✓ Statistics{' for ' + service if service else ''}:")
        print(f"  Uptime: {stats['uptime_percentage']}%")
        print(f"  Error Rate: {stats['error_rate']}%")
        if stats['avg_response_time_ms']:
            print(f"  Avg Response Time: {stats['avg_response_time_ms']}ms")
        if stats['avg_cpu_usage']:
            print(f"  Avg CPU: {stats['avg_cpu_usage']}%")
        if stats['avg_memory_usage']:
            print(f"  Avg Memory: {stats['avg_memory_usage']}%")
        return data

    # ==================== Health Monitoring ====================

    def get_health(self, project_id: str, service: str = None):
        """Get health status for project or specific service."""
        params = {"service": service} if service else {}
        response = requests.get(
            f"{self.base_url}/health/{project_id}",
            headers=self._headers(),
            params=params
        )
        response.raise_for_status()
        data = response.json()
        print(f"✓ Health status: {data['overall_status']} (score: {data['overall_score']:.2f})")
        for comp in data["components"]:
            status_icon = "✓" if comp["status"] == "healthy" else "⚠" if comp["status"] == "degraded" else "✗"
            print(f"  {status_icon} {comp['component']}: {comp['status']} ({comp['score']:.2f})")
            for issue in comp["issues"]:
                print(f"      - {issue}")
        return data

    # ==================== Logs ====================

    def get_logs(self, project_id: str, level: str = None, service: str = None,
                search: str = None, limit: int = 100):
        """Get log events."""
        params = {"limit": limit}
        if level:
            params["level"] = level
        if service:
            params["service"] = service
        if search:
            params["search"] = search

        response = requests.get(
            f"{self.base_url}/logs/{project_id}",
            headers=self._headers(),
            params=params
        )
        response.raise_for_status()
        data = response.json()
        print(f"✓ Retrieved {data['total']} log events")
        return data


def run_demo():
    """Run a complete demo of the API."""
    print("=" * 60)
    print("AppScope API Demo")
    print("=" * 60)

    client = AppScopeAPIClient(BASE_URL)

    try:
        # 1. Login
        print("\n1. Authentication")
        print("-" * 60)
        client.login(TEST_EMAIL, TEST_PASSWORD)

        # 2. Create Project
        print("\n2. Project Management")
        print("-" * 60)
        project = client.create_project(
            name=f"Demo Project {datetime.now().strftime('%Y%m%d%H%M%S')}",
            description="API demo project",
            environment="development"
        )

        # 3. Create Services
        print("\n3. Service Configuration")
        print("-" * 60)
        backend = client.create_service(
            project_id=client.project_id,
            name="api-server",
            service_type="backend_api",
            description="Main API server",
            config={"port": 8000, "workers": 4}
        )

        database = client.create_service(
            project_id=client.project_id,
            name="postgres",
            service_type="postgresql",
            description="PostgreSQL database",
            config={"host": "localhost", "port": 5432}
        )

        client.list_services(client.project_id)

        # 4. Ingest Sample Data
        print("\n4. Data Ingestion")
        print("-" * 60)

        # Sample metrics
        now = datetime.utcnow()
        metrics = [
            {
                "timestamp": now.isoformat(),
                "metric_type": "cpu",
                "metric_name": "cpu_usage",
                "source": "api-server",
                "value": 45.5,
                "unit": "percent"
            },
            {
                "timestamp": now.isoformat(),
                "metric_type": "memory",
                "metric_name": "memory_usage",
                "source": "api-server",
                "value": 62.3,
                "unit": "percent"
            }
        ]
        client.ingest_metrics(metrics)

        # Sample logs
        logs = [
            {
                "timestamp": now.isoformat(),
                "level": "INFO",
                "service": "api-server",
                "message": "Request processed successfully",
                "http_method": "GET",
                "http_path": "/api/users",
                "http_status": 200,
                "response_time_ms": 45
            },
            {
                "timestamp": now.isoformat(),
                "level": "ERROR",
                "service": "api-server",
                "message": "Database connection timeout",
                "stack_trace": "Traceback..."
            }
        ]
        client.ingest_logs(logs)

        # 5. Query Data
        print("\n5. Data Retrieval")
        print("-" * 60)
        client.get_metrics(client.project_id, limit=10)
        client.get_logs(client.project_id, limit=10)

        # 6. Get Statistics
        print("\n6. Statistics & Analytics")
        print("-" * 60)
        client.get_project_stats(client.project_id)
        client.get_metric_stats(client.project_id)

        # 7. Health Monitoring
        print("\n7. Health Monitoring")
        print("-" * 60)
        client.get_health(client.project_id)

        # 8. Update Operations
        print("\n8. Update Operations")
        print("-" * 60)
        client.update_project(
            client.project_id,
            description="Updated demo project"
        )

        # 9. Cleanup (optional - comment out to keep data)
        print("\n9. Cleanup")
        print("-" * 60)
        # client.delete_project(client.project_id)

        print("\n" + "=" * 60)
        print("Demo completed successfully!")
        print("=" * 60)

    except requests.exceptions.RequestException as e:
        print(f"\n✗ API Error: {e}")
        if hasattr(e.response, 'text'):
            print(f"Response: {e.response.text}")
    except Exception as e:
        print(f"\n✗ Error: {e}")


if __name__ == "__main__":
    print(__doc__)
    choice = input("\nRun demo? (y/n): ")
    if choice.lower() == 'y':
        run_demo()
    else:
        print("\nDemo cancelled. You can import this module to use the API client:")
        print("  from test_api_examples import AppScopeAPIClient")
        print("  client = AppScopeAPIClient('http://localhost:8000/api/v1')")
        print("  client.login('email@example.com', 'password')")
