from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timezone

from app.db import get_db
from app.api.deps import get_current_user
from app.models import User, Project, APIKey, Service
from app.schemas.project import (
    ProjectCreate,
    ProjectUpdate,
    ProjectResponse,
    ProjectWithAPIKey,
    APIKeyResponse,
    ProjectListResponse,
)
from app.schemas.service import AgentStatusResponse, ServiceStatus
from app.core.security import generate_api_key, hash_api_key
from app.services.project import get_project_stats

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("", response_model=ProjectListResponse)
async def list_projects(
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all projects for current user with pagination.

    Args:
        limit: Maximum number of projects to return (default: 50, max: 100)
        offset: Number of projects to skip (default: 0)
    """
    # Validate pagination parameters
    if limit < 1 or limit > 100:
        raise HTTPException(status_code=400, detail="Limit must be between 1 and 100")
    if offset < 0:
        raise HTTPException(status_code=400, detail="Offset must be non-negative")

    # Get total count
    count_result = await db.execute(
        select(func.count(Project.id))
        .where(Project.owner_id == current_user.id)
    )
    total = count_result.scalar() or 0

    # Get paginated projects
    result = await db.execute(
        select(Project)
        .where(Project.owner_id == current_user.id)
        .order_by(Project.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    projects = result.scalars().all()

    # Convert projects to response models with computed agent_connected field
    project_responses = [ProjectResponse.from_project(p) for p in projects]

    return ProjectListResponse(projects=project_responses, total=total)


@router.post("", response_model=ProjectWithAPIKey, status_code=status.HTTP_201_CREATED)
async def create_project(
    project_data: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new project with API key."""
    # Check for duplicate project name for this user
    result = await db.execute(
        select(Project).where(
            Project.owner_id == current_user.id,
            Project.name == project_data.name
        )
    )
    existing_project = result.scalar_one_or_none()

    if existing_project:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Project with name '{project_data.name}' already exists"
        )

    # Create project
    project = Project(
        name=project_data.name,
        description=project_data.description,
        environment=project_data.environment,
        owner_id=current_user.id,
    )
    db.add(project)
    await db.flush()

    # Generate API key
    plain_api_key = generate_api_key()
    api_key = APIKey(
        key_hash=hash_api_key(plain_api_key),
        key_prefix=plain_api_key[:16],
        name="Default",
        project_id=project.id,
    )
    db.add(api_key)
    # No need to commit here - dependency handles it
    await db.flush()
    await db.refresh(project)

    return ProjectWithAPIKey(
        project=ProjectResponse.from_project(project),
        api_key=plain_api_key,
    )


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific project."""
    from uuid import UUID

    try:
        project_uuid = UUID(project_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid project ID")

    result = await db.execute(
        select(Project).where(
            Project.id == project_uuid,
            Project.owner_id == current_user.id
        )
    )
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    return ProjectResponse.from_project(project)


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    project_data: ProjectUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update project settings."""
    from uuid import UUID

    try:
        project_uuid = UUID(project_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid project ID")

    result = await db.execute(
        select(Project).where(
            Project.id == project_uuid,
            Project.owner_id == current_user.id
        )
    )
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Update fields if provided
    if project_data.name is not None:
        # Check for duplicate name
        if project_data.name != project.name:
            result = await db.execute(
                select(Project).where(
                    Project.owner_id == current_user.id,
                    Project.name == project_data.name,
                    Project.id != project_uuid
                )
            )
            if result.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Project with name '{project_data.name}' already exists"
                )
        project.name = project_data.name

    if project_data.description is not None:
        project.description = project_data.description

    if project_data.environment is not None:
        project.environment = project_data.environment

    if project_data.is_active is not None:
        project.is_active = project_data.is_active

    await db.flush()
    await db.refresh(project)

    return ProjectResponse.from_project(project)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a project and all associated data."""
    from uuid import UUID

    try:
        project_uuid = UUID(project_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid project ID")

    result = await db.execute(
        select(Project).where(
            Project.id == project_uuid,
            Project.owner_id == current_user.id
        )
    )
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    await db.delete(project)
    # Commit is handled by get_db dependency


@router.get("/{project_id}/api-keys", response_model=list[APIKeyResponse])
async def list_api_keys(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all API keys for a project."""
    from uuid import UUID

    try:
        project_uuid = UUID(project_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid project ID")

    # Verify ownership
    result = await db.execute(
        select(Project).where(
            Project.id == project_uuid,
            Project.owner_id == current_user.id
        )
    )
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    result = await db.execute(
        select(APIKey).where(APIKey.project_id == project_uuid)
    )
    return result.scalars().all()


@router.post("/{project_id}/api-keys", response_model=dict)
async def create_api_key(
    project_id: str,
    name: str = "API Key",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new API key for a project."""
    from uuid import UUID

    try:
        project_uuid = UUID(project_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid project ID")

    # Verify ownership
    result = await db.execute(
        select(Project).where(
            Project.id == project_uuid,
            Project.owner_id == current_user.id
        )
    )
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Generate new API key
    plain_api_key = generate_api_key()
    api_key = APIKey(
        key_hash=hash_api_key(plain_api_key),
        key_prefix=plain_api_key[:16],
        name=name,
        project_id=project.id,
    )
    db.add(api_key)
    await db.flush()
    # Commit is handled by get_db dependency

    return {"api_key": plain_api_key, "message": "Save this key! You won't see it again."}


@router.post("/{project_id}/api-keys/regenerate", response_model=dict)
async def regenerate_api_key(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Regenerate the default API key for a project.

    WARNING: This will invalidate the existing API key.
    Agents using the old key will stop working until updated.
    """
    from uuid import UUID

    try:
        project_uuid = UUID(project_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid project ID")

    # Verify ownership
    result = await db.execute(
        select(Project).where(
            Project.id == project_uuid,
            Project.owner_id == current_user.id
        )
    )
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Find the default API key
    result = await db.execute(
        select(APIKey).where(
            APIKey.project_id == project_uuid,
            APIKey.name == "Default"
        )
    )
    api_key = result.scalar_one_or_none()

    if not api_key:
        raise HTTPException(status_code=404, detail="Default API key not found")

    # Generate new API key
    plain_api_key = generate_api_key()
    api_key.key_hash = hash_api_key(plain_api_key)
    api_key.key_prefix = plain_api_key[:16]

    await db.flush()

    return {
        "api_key": plain_api_key,
        "message": "API key regenerated successfully. Update your agents immediately!"
    }


@router.get("/{project_id}/stats")
async def get_stats(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get comprehensive statistics for a project.

    Includes service count, recent activity, data volume, etc.
    """
    from uuid import UUID

    try:
        project_uuid = UUID(project_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid project ID")

    # Verify ownership
    result = await db.execute(
        select(Project).where(
            Project.id == project_uuid,
            Project.owner_id == current_user.id
        )
    )
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    stats = await get_project_stats(project_uuid, db)

    return {
        "project_id": str(project_uuid),
        "project_name": project.name,
        "stats": stats
    }


@router.get("/{project_id}/agent-status", response_model=AgentStatusResponse)
async def get_agent_status(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get agent connection status for all services in a project.

    Returns:
        - List of all services with their connection status
        - Last heartbeat timestamp for each service
        - Count of connected vs disconnected services

    A service is considered "connected" if it has sent data within the last 2 minutes.
    """
    from uuid import UUID

    try:
        project_uuid = UUID(project_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid project ID")

    # Verify ownership
    result = await db.execute(
        select(Project).where(
            Project.id == project_uuid,
            Project.owner_id == current_user.id
        )
    )
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Get all services for this project
    result = await db.execute(
        select(Service).where(Service.project_id == project_uuid)
    )
    services = result.scalars().all()

    # Build service status list
    service_statuses = []
    connected_count = 0
    disconnected_count = 0
    current_time = datetime.now(timezone.utc)

    for service in services:
        # Calculate connection status (connected if heartbeat within last 2 minutes)
        is_connected = False
        time_since_heartbeat = None

        if service.last_heartbeat:
            time_diff = current_time - service.last_heartbeat
            is_connected = time_diff.total_seconds() < 120  # 2 minutes

            # Human-readable time
            seconds = int(time_diff.total_seconds())
            if seconds < 60:
                time_since_heartbeat = f"{seconds} seconds ago"
            elif seconds < 3600:
                minutes = seconds // 60
                time_since_heartbeat = f"{minutes} minute{'s' if minutes != 1 else ''} ago"
            elif seconds < 86400:
                hours = seconds // 3600
                time_since_heartbeat = f"{hours} hour{'s' if hours != 1 else ''} ago"
            else:
                days = seconds // 86400
                time_since_heartbeat = f"{days} day{'s' if days != 1 else ''} ago"

        if is_connected:
            connected_count += 1
        else:
            disconnected_count += 1

        service_statuses.append(
            ServiceStatus(
                service_id=service.id,
                service_name=service.name,
                service_type=service.service_type.value,
                is_connected=is_connected,
                last_heartbeat=service.last_heartbeat,
                time_since_heartbeat=time_since_heartbeat,
            )
        )

    return AgentStatusResponse(
        project_id=project_uuid,
        project_name=project.name,
        services=service_statuses,
        total_services=len(services),
        connected_services=connected_count,
        disconnected_services=disconnected_count,
    )


@router.post("/{project_id}/deactivate", response_model=ProjectResponse)
async def deactivate_project(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Deactivate a project.

    This sets is_active to False, which stops data ingestion
    but preserves all historical data. The project can be reactivated later.
    """
    from uuid import UUID

    try:
        project_uuid = UUID(project_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid project ID")

    result = await db.execute(
        select(Project).where(
            Project.id == project_uuid,
            Project.owner_id == current_user.id
        )
    )
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not project.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Project is already deactivated"
        )

    project.is_active = False
    await db.flush()
    await db.refresh(project)

    return ProjectResponse.from_project(project)


@router.post("/{project_id}/reactivate", response_model=ProjectResponse)
async def reactivate_project(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Reactivate a previously deactivated project.

    This sets is_active to True, allowing data ingestion to resume.
    """
    from uuid import UUID

    try:
        project_uuid = UUID(project_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid project ID")

    result = await db.execute(
        select(Project).where(
            Project.id == project_uuid,
            Project.owner_id == current_user.id
        )
    )
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if project.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Project is already active"
        )

    project.is_active = True
    await db.flush()
    await db.refresh(project)

    return ProjectResponse.from_project(project)
