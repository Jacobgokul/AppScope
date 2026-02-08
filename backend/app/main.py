from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, PlainTextResponse
from contextlib import asynccontextmanager
from pathlib import Path
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import gzip

from app.config import settings
from app.api.v1.router import api_router
from app.db.session import engine, Base


class GzipRequestMiddleware:
    """Raw ASGI middleware to decompress gzip-encoded request bodies."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        # Check for gzip content-encoding in headers
        headers = dict(scope.get("headers", []))
        content_encoding = headers.get(b"content-encoding", b"").decode()

        if content_encoding == "gzip":
            # Collect the body
            body_parts = []
            while True:
                message = await receive()
                body_parts.append(message.get("body", b""))
                if not message.get("more_body", False):
                    break

            # Decompress
            compressed_body = b"".join(body_parts)
            try:
                decompressed_body = gzip.decompress(compressed_body)
            except Exception:
                decompressed_body = compressed_body

            # Create new receive that returns decompressed body
            body_sent = False

            async def new_receive():
                nonlocal body_sent
                if not body_sent:
                    body_sent = True
                    return {"type": "http.request", "body": decompressed_body, "more_body": False}
                return {"type": "http.request", "body": b"", "more_body": False}

            await self.app(scope, new_receive, send)
        else:
            await self.app(scope, receive, send)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    # Shutdown
    await engine.dispose()


# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title=settings.app_name,
    description="AI-Powered Application Monitoring",
    version="1.0.0",
    lifespan=lifespan,
)

# Add rate limiter to app state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS - must be added after other middleware to run first
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With", "Content-Encoding"],
    expose_headers=["*"],
)

# Routes
app.include_router(api_router, prefix=settings.api_v1_prefix)


@app.get("/")
async def root():
    return {
        "name": settings.app_name,
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/install.sh")
async def get_install_script():
    """Serve the agent installation script."""
    script_path = Path(__file__).parent.parent.parent / "scripts" / "install.sh"
    if script_path.exists():
        return FileResponse(
            script_path,
            media_type="text/x-shellscript",
            filename="install.sh"
        )
    # Fallback: return inline script
    return PlainTextResponse(
        "#!/bin/bash\necho 'Install script not found. Please download from releases.'\nexit 1",
        media_type="text/x-shellscript"
    )


# Wrap app with Gzip middleware LAST (after all FastAPI config)
app = GzipRequestMiddleware(app)
