from pydantic_settings import BaseSettings
from functools import lru_cache
import sys


class Settings(BaseSettings):
    # App
    app_name: str = "AppScope"
    debug: bool = False
    api_v1_prefix: str = "/api/v1"

    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    workers: int = 4

    # Database
    database_url: str = "postgresql+asyncpg://postgres:123@localhost:5433/appscope"

    # Auth - SECRET_KEY is REQUIRED and must be set via environment variable
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    # AI / LLM
    llm_api_url: str = ""
    llm_api_key: str = ""

    # Email Notifications (SMTP)
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    from_email: str = "alerts@appscope.io"

    # Frontend
    frontend_url: str = "https://appscope.io"

    # TimescaleDB Data Retention
    # These values are used as defaults in migrations and can be overridden
    # by updating the retention policies directly in TimescaleDB
    metrics_retention_days: int = 30
    logs_retention_days: int = 14
    compression_after_days: int = 7

    # CORS
    # Configure allowed origins for Cross-Origin Resource Sharing
    # Set via CORS_ORIGINS env var as JSON array: ["http://localhost:3000","https://app.example.com"]
    # In production, set to your frontend domain(s) only
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
    ]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    settings = Settings()
    _validate_secret_key(settings.secret_key)
    return settings


def _validate_secret_key(secret_key: str) -> None:
    """Validate that the secret key is secure and not using insecure defaults."""
    # List of insecure default values
    insecure_defaults = [
        "your-secret-key-change-in-production",
        "change-me",
        "changeme",
        "secret",
        "password",
        "test",
        "dev",
        "default",
    ]

    # Check if empty
    if not secret_key or not secret_key.strip():
        print("ERROR: SECRET_KEY is empty or not set", file=sys.stderr)
        print("SOLUTION: Set SECRET_KEY environment variable to a strong random value", file=sys.stderr)
        print("Generate one with: openssl rand -hex 32", file=sys.stderr)
        sys.exit(1)

    # Check if using insecure default
    if secret_key.lower() in insecure_defaults:
        print(f"ERROR: SECRET_KEY is using insecure default value: {secret_key}", file=sys.stderr)
        print("SOLUTION: Set SECRET_KEY environment variable to a strong random value", file=sys.stderr)
        print("Generate one with: openssl rand -hex 32", file=sys.stderr)
        sys.exit(1)

    # Check minimum length (32 characters for HS256)
    if len(secret_key) < 32:
        print(f"ERROR: SECRET_KEY is too short ({len(secret_key)} characters). Minimum 32 characters required.", file=sys.stderr)
        print("SOLUTION: Set SECRET_KEY environment variable to a strong random value", file=sys.stderr)
        print("Generate one with: openssl rand -hex 32", file=sys.stderr)
        sys.exit(1)


settings = get_settings()
