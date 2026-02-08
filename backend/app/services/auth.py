"""
Authentication service - business logic for user authentication.

This module handles user registration, login, token refresh,
and other authentication-related operations.
"""
from typing import Optional
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.user import User
from app.schemas.user import UserCreate, UserLogin, Token
from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
    validate_password_strength,
)
from app.core.exceptions import ConflictError, AuthenticationError


async def register_user(db: AsyncSession, user_data: UserCreate) -> User:
    """
    Register a new user.

    Args:
        db: Database session
        user_data: User registration data

    Returns:
        Created user object

    Raises:
        ConflictError: If user with email already exists
        ValueError: If password doesn't meet requirements
    """
    # Validate password strength
    is_valid, error_message = validate_password_strength(user_data.password)
    if not is_valid:
        raise ValueError(error_message)

    # Check if user already exists
    result = await db.execute(select(User).where(User.email == user_data.email))
    existing_user = result.scalar_one_or_none()

    if existing_user:
        raise ConflictError("User with this email already exists")

    # Create new user
    user = User(
        email=user_data.email,
        hashed_password=get_password_hash(user_data.password),
        company_name=user_data.company_name,
    )

    db.add(user)
    await db.flush()
    await db.refresh(user)

    return user


async def authenticate_user(db: AsyncSession, credentials: UserLogin) -> Token:
    """
    Authenticate user and return JWT tokens.

    Args:
        db: Database session
        credentials: User login credentials

    Returns:
        Access and refresh tokens

    Raises:
        AuthenticationError: If credentials are invalid or user is disabled
    """
    result = await db.execute(select(User).where(User.email == credentials.email))
    user = result.scalar_one_or_none()

    # Check user exists and password is correct
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise AuthenticationError("Incorrect email or password")

    # Check user is active
    if not user.is_active:
        raise AuthenticationError("User account is disabled")

    # Generate tokens
    return Token(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
    )


async def refresh_access_token(db: AsyncSession, refresh_token: str) -> Token:
    """
    Refresh access token using a refresh token.

    Args:
        db: Database session
        refresh_token: Valid refresh token

    Returns:
        New access and refresh tokens

    Raises:
        AuthenticationError: If refresh token is invalid or user is disabled
    """
    # Decode and validate refresh token
    payload = decode_token(refresh_token)

    if payload is None or payload.get("type") != "refresh":
        raise AuthenticationError("Invalid refresh token")

    user_id = payload.get("sub")
    if not user_id:
        raise AuthenticationError("Invalid token payload")

    # Get user
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise AuthenticationError("User not found or disabled")

    # Generate new tokens
    return Token(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
    )


async def get_user_by_id(db: AsyncSession, user_id: str) -> Optional[User]:
    """
    Get user by ID.

    Args:
        db: Database session
        user_id: User UUID as string

    Returns:
        User object if found, None otherwise
    """
    from uuid import UUID

    try:
        user_uuid = UUID(user_id)
    except ValueError:
        return None

    result = await db.execute(select(User).where(User.id == user_uuid))
    return result.scalar_one_or_none()


async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
    """
    Get user by email.

    Args:
        db: Database session
        email: User email address

    Returns:
        User object if found, None otherwise
    """
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def update_user(db: AsyncSession, user: User, **updates) -> User:
    """
    Update user fields.

    Args:
        db: Database session
        user: User object to update
        **updates: Fields to update

    Returns:
        Updated user object
    """
    for key, value in updates.items():
        if hasattr(user, key):
            setattr(user, key, value)

    user.updated_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(user)

    return user


async def deactivate_user(db: AsyncSession, user: User) -> User:
    """
    Deactivate a user account.

    Args:
        db: Database session
        user: User object to deactivate

    Returns:
        Updated user object
    """
    user.is_active = False
    user.updated_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(user)

    return user


async def verify_user_email(db: AsyncSession, user: User) -> User:
    """
    Mark user's email as verified.

    Args:
        db: Database session
        user: User object to verify

    Returns:
        Updated user object
    """
    user.is_verified = True
    user.updated_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(user)

    return user
