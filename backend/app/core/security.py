from datetime import datetime, timedelta, timezone
from typing import Any
from jose import jwt, JWTError
from passlib.context import CryptContext
import secrets
from app.config import settings

# Use pbkdf2_sha256 instead of bcrypt due to bcrypt 5.x incompatibility with passlib
# TODO: Upgrade to bcrypt 4.2.1 when possible
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash using constant-time comparison."""
    # pbkdf2_sha256 has no length limit (unlike bcrypt's 72-byte limit)
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password for secure storage."""
    # pbkdf2_sha256 has no length limit (unlike bcrypt's 72-byte limit)
    return pwd_context.hash(password)


def create_access_token(subject: str | Any, expires_delta: timedelta | None = None) -> str:
    """Create a JWT access token."""
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)

    to_encode = {"exp": expire, "sub": str(subject), "type": "access"}
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    return encoded_jwt


def create_refresh_token(subject: str | Any) -> str:
    """Create a JWT refresh token."""
    expire = datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)
    to_encode = {"exp": expire, "sub": str(subject), "type": "refresh"}
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    return encoded_jwt


def decode_token(token: str) -> dict | None:
    """Decode and validate a JWT token."""
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        return payload
    except JWTError:
        return None


def generate_api_key() -> str:
    """Generate a cryptographically secure API key for projects."""
    return f"ask_live_{secrets.token_hex(32)}"


def hash_api_key(api_key: str) -> str:
    """Hash API key for secure storage."""
    # pbkdf2_sha256 has no length limit (unlike bcrypt's 72-byte limit)
    return pwd_context.hash(api_key)


def verify_api_key(plain_api_key: str, hashed_api_key: str) -> bool:
    """Verify an API key against its hash using constant-time comparison."""
    # pbkdf2_sha256 has no length limit (unlike bcrypt's 72-byte limit)
    return pwd_context.verify(plain_api_key, hashed_api_key)


def validate_password_strength(password: str) -> tuple[bool, str | None]:
    """
    Validate password strength.

    Requirements:
    - Minimum 8 characters
    - At least one letter (a-z or A-Z)
    - At least one number (0-9)

    Returns:
        tuple: (is_valid: bool, error_message: str | None)
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"

    if not any(c.isalpha() for c in password):
        return False, "Password must contain at least one letter"

    if not any(c.isdigit() for c in password):
        return False, "Password must contain at least one number"

    return True, None
