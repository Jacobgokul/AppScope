from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from uuid import UUID

from app.db import get_db
from app.api.deps import get_current_user, get_project_by_id
from app.models import User, Project, Service
from app.schemas.service import (
    ServiceCreate,
    ServiceUpdate,
    ServiceResponse,
    ServiceListResponse,
)

router = APIRouter(prefix="/projects/{project_id}/services", tags=["services"])


@router.get("", response_model=ServiceListResponse)
async def list_services(
    project_id: str,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all services for a project.

    Args:
        project_id: Project UUID
        limit: Maximum number of services to return (default: 50, max: 100)
        offset: Number of services to skip (default: 0)
    """
    project = await get_project_by_id(project_id, current_user, db)

    # Validate pagination parameters
    if limit < 1 or limit > 100:
        raise HTTPException(status_code=400, detail="Limit must be between 1 and 100")
    if offset < 0:
        raise HTTPException(status_code=400, detail="Offset must be non-negative")

    # Get total count
    count_result = await db.execute(
        select(func.count(Service.id)).where(Service.project_id == project.id)
    )
    total = count_result.scalar() or 0

    # Get paginated services
    result = await db.execute(
        select(Service)
        .where(Service.project_id == project.id)
        .order_by(Service.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    services = result.scalars().all()

    return ServiceListResponse(services=services, total=total)


@router.post("", response_model=ServiceResponse, status_code=status.HTTP_201_CREATED)
async def create_service(
    project_id: str,
    service_data: ServiceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a new service to the project."""
    project = await get_project_by_id(project_id, current_user, db)

    # Check for duplicate service name within project
    result = await db.execute(
        select(Service).where(
            Service.project_id == project.id,
            Service.name == service_data.name
        )
    )
    existing_service = result.scalar_one_or_none()

    if existing_service:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Service with name '{service_data.name}' already exists in this project"
        )

    # Create service
    service = Service(
        name=service_data.name,
        service_type=service_data.service_type,
        description=service_data.description,
        config=service_data.config,
        project_id=project.id,
    )
    db.add(service)
    await db.flush()
    await db.refresh(service)

    return service


@router.get("/{service_id}", response_model=ServiceResponse)
async def get_service(
    project_id: str,
    service_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific service."""
    project = await get_project_by_id(project_id, current_user, db)

    try:
        service_uuid = UUID(service_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid service ID")

    result = await db.execute(
        select(Service).where(
            Service.id == service_uuid,
            Service.project_id == project.id
        )
    )
    service = result.scalar_one_or_none()

    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    return service


@router.put("/{service_id}", response_model=ServiceResponse)
async def update_service(
    project_id: str,
    service_id: str,
    service_data: ServiceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update service configuration."""
    project = await get_project_by_id(project_id, current_user, db)

    try:
        service_uuid = UUID(service_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid service ID")

    result = await db.execute(
        select(Service).where(
            Service.id == service_uuid,
            Service.project_id == project.id
        )
    )
    service = result.scalar_one_or_none()

    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    # Update fields if provided
    if service_data.name is not None:
        # Check for duplicate name
        if service_data.name != service.name:
            result = await db.execute(
                select(Service).where(
                    Service.project_id == project.id,
                    Service.name == service_data.name,
                    Service.id != service_uuid
                )
            )
            if result.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Service with name '{service_data.name}' already exists"
                )
        service.name = service_data.name

    if service_data.service_type is not None:
        service.service_type = service_data.service_type

    if service_data.description is not None:
        service.description = service_data.description

    if service_data.config is not None:
        service.config = service_data.config

    if service_data.is_active is not None:
        service.is_active = service_data.is_active

    await db.flush()
    await db.refresh(service)

    return service


@router.delete("/{service_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_service(
    project_id: str,
    service_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove a service from the project.

    This will also delete all associated metrics and logs for this service.
    """
    project = await get_project_by_id(project_id, current_user, db)

    try:
        service_uuid = UUID(service_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid service ID")

    result = await db.execute(
        select(Service).where(
            Service.id == service_uuid,
            Service.project_id == project.id
        )
    )
    service = result.scalar_one_or_none()

    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    await db.delete(service)
    # Commit is handled by get_db dependency
