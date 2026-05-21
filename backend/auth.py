"""
auth.py — JWT authentication utilities for Rehab Swat CMS.

Access tokens: 15-minute lifespan (configurable via ACCESS_TOKEN_EXPIRE_MINUTES).
Refresh tokens: 7-day lifespan, stored as UUID strings in the refresh_tokens table.
Secrets: loaded exclusively from environment via settings.py — never hardcoded.
"""
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt

from settings import settings

# ── OAuth2 scheme (tokenUrl must match the login endpoint) ────────────────────
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


# ── Password helpers ──────────────────────────────────────────────────────────

def verify_password(plain: str, hashed: str) -> bool:
    """Return True if the plain-text password matches the bcrypt hash."""
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def hash_password(password: str) -> str:
    """Return a bcrypt hash of the given password."""
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


# ── Access token ─────────────────────────────────────────────────────────────

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a signed JWT access token.

    Default expiry: ACCESS_TOKEN_EXPIRE_MINUTES (15 min).
    Payload includes 'sub' (user_id), 'role', 'name', and 'exp'.
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.access_token_expire_minutes)
    )
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.algorithm)


# ── Refresh token ─────────────────────────────────────────────────────────────

def create_refresh_token() -> str:
    """
    Generate a cryptographically random refresh token string (UUID4 hex).

    This value is stored in the refresh_tokens table and returned to the client.
    It is NOT a JWT — it's an opaque token that maps to a DB row.
    """
    return uuid.uuid4().hex


def get_refresh_token_expiry() -> datetime:
    """Return the absolute expiry datetime for a new refresh token."""
    return datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)


# ── Token decoding ────────────────────────────────────────────────────────────

def decode_token(token: str) -> dict:
    """
    Decode and verify a JWT access token.

    Returns the payload dict on success, or an empty dict on any failure.
    Callers must check for an empty dict (or missing 'sub') to detect failure.
    """
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.algorithm],
        )
        # Reject tokens that are not access tokens (e.g., accidentally passing refresh)
        if payload.get("type") != "access":
            return {}
        return payload
    except JWTError:
        return {}
