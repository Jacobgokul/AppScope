from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone

from app.db import get_db
from app.core.security import decode_token, verify_api_key
from app.core.exceptions import AuthenticationError, InvalidAPIKeyError
from app.models import User, Project, APIKey

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Get current authenticated user from JWT token."""
    token = credentials.credentials
    payload = decode_token(token)

    if payload is None:
        raise AuthenticationError("Invalid or expired token")

    if payload.get("type") != "access":
        raise AuthenticationError("Invalid token type")

    user_id = payload.get("sub")
    if user_id is None:
        raise AuthenticationError("Invalid token payload")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None:
        raise AuthenticationError("User not found")

    if not user.is_active:
        raise AuthenticationError("User account is disabled")

    return user


async def get_project_from_api_key(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> Project:
    """Get project from API key (used by agent for data ingestion).

    Optimized to query by prefix first, then verify hash.
    """
    api_key = credentials.credentials

    # API keys start with "ask_"
    if not api_key.startswith("ask_"):
        raise InvalidAPIKeyError()

    # Extract prefix (first 16 characters)
    key_prefix = api_key[:16]

    # Query by prefix first (uses index) - narrow down candidates
    result = await db.execute(
        select(APIKey)
        .join(Project)
        .where(
            APIKey.key_prefix == key_prefix,
            APIKey.is_active == True,
            Project.is_active == True
        )
    )
    api_keys = result.scalars().all()

    # Verify hash for matching prefix candidates
    project = None
    for key in api_keys:
        if verify_api_key(api_key, key.key_hash):
            # Update last used timestamp
            key.last_used_at = datetime.now(timezone.utc)
            await db.flush()
            # Load the project with relationship
            result = await db.execute(
                select(Project).where(
                    Project.id == key.project_id,
                    Project.is_active == True
                )
            )
            project = result.scalar_one_or_none()
            break

    if project is None:
        raise InvalidAPIKeyError()

    return project


async def get_project_by_id(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Project:
    """Get project by ID, ensuring user owns it."""
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

    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    return project
