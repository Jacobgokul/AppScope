from pydantic import BaseModel, EmailStr, field_validator
from datetime import datetime
from uuid import UUID
import re


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    company_name: str | None = None

    @field_validator('company_name')
    @classmethod
    def sanitize_company_name(cls, v: str | None) -> str | None:
        """
        Sanitize company name to prevent XSS and ensure data integrity.

        - Remove HTML tags
        - Remove null bytes
        - Limit length to 255 characters
        - Strip leading/trailing whitespace
        """
        if v is None:
            return None

        # Remove null bytes
        sanitized = v.replace('\x00', '')

        # Strip HTML tags using regex
        sanitized = re.sub(r'<[^>]+>', '', sanitized)

        # Strip leading/trailing whitespace
        sanitized = sanitized.strip()

        # Limit length to 255 characters
        if len(sanitized) > 255:
            sanitized = sanitized[:255]

        # Return None if empty after sanitization
        return sanitized if sanitized else None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class NotificationPreferences(BaseModel):
    email_critical_alerts: bool = True
    email_daily_summary: bool = True
    email_weekly_reports: bool = False
    email_ai_analysis: bool = True


class UserResponse(BaseModel):
    id: UUID
    email: str
    company_name: str | None
    is_active: bool
    is_verified: bool
    created_at: datetime
    notification_preferences: NotificationPreferences

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    sub: str
    exp: datetime
    type: str


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class UserUpdateProfile(BaseModel):
    company_name: str | None = None

    @field_validator('company_name')
    @classmethod
    def sanitize_company_name(cls, v: str | None) -> str | None:
        """
        Sanitize company name to prevent XSS and ensure data integrity.

        - Remove HTML tags
        - Remove null bytes
        - Limit length to 255 characters
        - Strip leading/trailing whitespace
        """
        if v is None:
            return None

        # Remove null bytes
        sanitized = v.replace('\x00', '')

        # Strip HTML tags using regex
        sanitized = re.sub(r'<[^>]+>', '', sanitized)

        # Strip leading/trailing whitespace
        sanitized = sanitized.strip()

        # Limit length to 255 characters
        if len(sanitized) > 255:
            sanitized = sanitized[:255]

        # Return None if empty after sanitization
        return sanitized if sanitized else None


class UserUpdatePreferences(BaseModel):
    notification_preferences: NotificationPreferences
