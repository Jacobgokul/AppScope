"""
Tests for service tracking functionality in ingestion endpoints.
"""
import pytest
from datetime import datetime, timezone
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models import User, Project, Service, Metric, LogEvent
from app.core.security import generate_api_key, hash_api_key


@pytest.fixture
async def test_project_with_api_key(db_session: AsyncSession, test_user: User):
    """Create a test project with API key."""
    project = Project(
        name="Test Project",
        description="Test project for service tracking",
        environment="development",
        owner_id=test_user.id,
    )
    db_session.add(project)
    await db_session.flush()

    # Generate API key
    from app.models import APIKey
    plain_api_key = generate_api_key()
    api_key = APIKey(
        key_hash=hash_api_key(plain_api_key),
        key_prefix=plain_api_key[:16],
        name="Test Key",
        project_id=project.id,
    )
    db_session.add(api_key)
    await db_session.commit()
    await db_session.refresh(project)

    return project, plain_api_key


@pytest.mark.asyncio
async def test_ingest_metrics_creates_default_service(
    async_client: AsyncClient,
    db_session: AsyncSession,
    test_project_with_api_key,
):
    """Test that ingesting metrics without service_name creates default service."""
    project, api_key = test_project_with_api_key

    response = await async_client.post(
        "/api/v1/ingest/metrics",
        json={
            "metrics": [
                {
                    "metric_type": "cpu",
                    "metric_name": "cpu_usage",
                    "value": 45.5,
                    "unit": "percent",
                }
            ]
        },
        headers={"X-API-Key": api_key},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["received"] == 1
    assert data["service_name"] == "default"

    # Verify service was created
    result = await db_session.execute(
        select(Service).where(
            Service.project_id == project.id,
            Service.name == "default"
        )
    )
    service = result.scalar_one_or_none()
    assert service is not None
    assert service.last_heartbeat is not None


@pytest.mark.asyncio
async def test_ingest_metrics_with_service_name(
    async_client: AsyncClient,
    db_session: AsyncSession,
    test_project_with_api_key,
):
    """Test that ingesting metrics with service_name creates named service."""
    project, api_key = test_project_with_api_key

    response = await async_client.post(
        "/api/v1/ingest/metrics",
        json={
            "service_name": "backend-api",
            "metrics": [
                {
                    "metric_type": "cpu",
                    "metric_name": "cpu_usage",
                    "value": 45.5,
                    "unit": "percent",
                }
            ]
        },
        headers={"X-API-Key": api_key},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["service_name"] == "backend-api"

    # Verify service was created
    result = await db_session.execute(
        select(Service).where(
            Service.project_id == project.id,
            Service.name == "backend-api"
        )
    )
    service = result.scalar_one_or_none()
    assert service is not None
    assert service.last_heartbeat is not None

    # Verify metric is associated with service
    result = await db_session.execute(
        select(Metric).where(Metric.project_id == project.id)
    )
    metric = result.scalar_one()
    assert metric.service_id == service.id


@pytest.mark.asyncio
async def test_ingest_logs_creates_service(
    async_client: AsyncClient,
    db_session: AsyncSession,
    test_project_with_api_key,
):
    """Test that ingesting logs creates service."""
    project, api_key = test_project_with_api_key

    response = await async_client.post(
        "/api/v1/ingest/logs",
        json={
            "service_name": "web-server",
            "logs": [
                {
                    "level": "error",
                    "message": "Test error message",
                    "source": "/var/log/app.log",
                }
            ]
        },
        headers={"X-API-Key": api_key},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["service_name"] == "web-server"

    # Verify service was created
    result = await db_session.execute(
        select(Service).where(
            Service.project_id == project.id,
            Service.name == "web-server"
        )
    )
    service = result.scalar_one_or_none()
    assert service is not None

    # Verify log is associated with service
    result = await db_session.execute(
        select(LogEvent).where(LogEvent.project_id == project.id)
    )
    log = result.scalar_one()
    assert log.service_id == service.id


@pytest.mark.asyncio
async def test_multiple_ingests_update_heartbeat(
    async_client: AsyncClient,
    db_session: AsyncSession,
    test_project_with_api_key,
):
    """Test that multiple ingests update service heartbeat."""
    project, api_key = test_project_with_api_key

    # First ingest
    response1 = await async_client.post(
        "/api/v1/ingest/metrics",
        json={
            "service_name": "test-service",
            "metrics": [
                {
                    "metric_type": "cpu",
                    "metric_name": "cpu_usage",
                    "value": 45.5,
                }
            ]
        },
        headers={"X-API-Key": api_key},
    )
    assert response1.status_code == 201

    # Get service and first heartbeat
    result = await db_session.execute(
        select(Service).where(
            Service.project_id == project.id,
            Service.name == "test-service"
        )
    )
    service = result.scalar_one()
    first_heartbeat = service.last_heartbeat

    # Second ingest (should update heartbeat)
    response2 = await async_client.post(
        "/api/v1/ingest/metrics",
        json={
            "service_name": "test-service",
            "metrics": [
                {
                    "metric_type": "memory",
                    "metric_name": "memory_usage",
                    "value": 70.0,
                }
            ]
        },
        headers={"X-API-Key": api_key},
    )
    assert response2.status_code == 201

    # Verify heartbeat was updated
    await db_session.refresh(service)
    assert service.last_heartbeat > first_heartbeat


@pytest.mark.asyncio
async def test_agent_status_endpoint(
    async_client: AsyncClient,
    db_session: AsyncSession,
    test_project_with_api_key,
    test_user_tokens,
):
    """Test the agent status endpoint."""
    project, api_key = test_project_with_api_key
    access_token, _ = test_user_tokens

    # Create some services by ingesting data
    await async_client.post(
        "/api/v1/ingest/metrics",
        json={
            "service_name": "service-1",
            "metrics": [{"metric_type": "cpu", "metric_name": "cpu_usage", "value": 45.5}]
        },
        headers={"X-API-Key": api_key},
    )

    await async_client.post(
        "/api/v1/ingest/metrics",
        json={
            "service_name": "service-2",
            "metrics": [{"metric_type": "memory", "metric_name": "memory_usage", "value": 70.0}]
        },
        headers={"X-API-Key": api_key},
    )

    # Get agent status
    response = await async_client.get(
        f"/api/v1/projects/{project.id}/agent-status",
        headers={"Authorization": f"Bearer {access_token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["project_id"] == str(project.id)
    assert data["total_services"] == 2
    assert data["connected_services"] == 2  # Both just sent data
    assert len(data["services"]) == 2

    # Check service status structure
    service_status = data["services"][0]
    assert "service_id" in service_status
    assert "service_name" in service_status
    assert "is_connected" in service_status
    assert "last_heartbeat" in service_status
    assert service_status["is_connected"] is True


@pytest.mark.asyncio
async def test_individual_metric_service_override(
    async_client: AsyncClient,
    db_session: AsyncSession,
    test_project_with_api_key,
):
    """Test that individual metrics can override batch service_name."""
    project, api_key = test_project_with_api_key

    response = await async_client.post(
        "/api/v1/ingest/metrics",
        json={
            "service_name": "default-service",
            "metrics": [
                {
                    "metric_type": "cpu",
                    "metric_name": "cpu_usage",
                    "value": 45.5,
                    "service_name": "override-service",
                }
            ]
        },
        headers={"X-API-Key": api_key},
    )

    assert response.status_code == 201

    # Verify both services were created
    result = await db_session.execute(
        select(Service).where(Service.project_id == project.id)
    )
    services = result.scalars().all()
    service_names = {s.name for s in services}
    assert "default-service" in service_names
    assert "override-service" in service_names

    # Verify metric is associated with override service
    result = await db_session.execute(
        select(Metric).where(Metric.project_id == project.id)
    )
    metric = result.scalar_one()
    result = await db_session.execute(
        select(Service).where(Service.name == "override-service")
    )
    override_service = result.scalar_one()
    assert metric.service_id == override_service.id
