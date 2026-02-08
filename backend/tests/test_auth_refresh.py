"""
Test auth refresh token flow to verify Bug B2 is fixed.
Ensures frontend and backend parameter passing is correct.
"""
import pytest
from httpx import AsyncClient
from fastapi import status


@pytest.mark.asyncio
async def test_refresh_token_with_body(async_client: AsyncClient, test_user_tokens):
    """Test that refresh token endpoint accepts token in request body."""
    access_token, refresh_token = test_user_tokens

    # This is how the frontend sends it - in the request body
    response = await async_client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token}
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"
    assert isinstance(data["access_token"], str)
    assert isinstance(data["refresh_token"], str)


@pytest.mark.asyncio
async def test_refresh_token_invalid(async_client: AsyncClient):
    """Test that invalid refresh token is rejected."""
    response = await async_client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": "invalid_token"}
    )

    assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.asyncio
async def test_refresh_token_missing(async_client: AsyncClient):
    """Test that missing refresh token returns 422."""
    response = await async_client.post(
        "/api/v1/auth/refresh",
        json={}
    )

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


@pytest.mark.asyncio
async def test_refresh_token_with_access_token_should_fail(async_client: AsyncClient, test_user_tokens):
    """Test that using an access token instead of refresh token fails."""
    access_token, refresh_token = test_user_tokens

    # Try to use access token as refresh token - should fail
    response = await async_client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": access_token}
    )

    assert response.status_code == status.HTTP_401_UNAUTHORIZED
