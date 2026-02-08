from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models import User
from app.schemas import UserResponse, UserUpdateProfile, UserUpdatePreferences
from app.api.deps import get_current_user

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user),
):
    """Get current user information."""
    return current_user


@router.patch("/me/profile", response_model=UserResponse)
async def update_user_profile(
    profile_data: UserUpdateProfile,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update user profile information."""
    if profile_data.company_name is not None:
        current_user.company_name = profile_data.company_name

    await db.flush()
    await db.refresh(current_user)

    return current_user


@router.patch("/me/preferences", response_model=UserResponse)
async def update_user_preferences(
    preferences_data: UserUpdatePreferences,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update user notification preferences."""
    current_user.notification_preferences = preferences_data.notification_preferences.model_dump()

    await db.flush()
    await db.refresh(current_user)

    return current_user
