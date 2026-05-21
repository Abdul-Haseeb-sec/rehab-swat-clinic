"""
settings.py — Centralised configuration for Rehab Swat CMS.

All secrets and environment-specific values are read from environment variables
(or a .env file). Never hardcode secrets in source code.

Usage:
    from settings import settings
    print(settings.jwt_secret_key)
"""
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # ── JWT Auth ───────────────────────────────────────────────────────────────
    jwt_secret_key: str = ""
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 15          # Short-lived access token
    refresh_token_expire_days: int = 7             # Long-lived refresh token

    # ── Database ───────────────────────────────────────────────────────────────
    database_url: str = "sqlite:///./rehab_swat.db"

    # ── CORS ───────────────────────────────────────────────────────────────────
    # Stored as a comma-separated string from environment, e.g.:
    #   CORS_ALLOWED_ORIGINS="http://localhost:5173,https://app.rehabswat.pk"
    cors_allowed_origins: str = "http://localhost:5173,http://localhost:8000,http://127.0.0.1:8000"

    # ── Redis (for rate limiting + future Celery) ──────────────────────────────
    redis_url: str = "redis://localhost:6379/0"

    # ── Cloudinary (Phase 2) ───────────────────────────────────────────────────
    cloudinary_url: str = ""

    # ── Twilio (Phase 3) ──────────────────────────────────────────────────────
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_whatsapp_from: str = ""

    # ── Production Hardening (Phase 5) ────────────────────────────────────────
    sentry_dsn: str = ""
    environment: str = "production"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",          # Ignore unknown env vars (prevents startup errors)
    )

    @property
    def parsed_cors_origins(self) -> list[str]:
        """Parse comma-separated CORS origins string into a list."""
        return [o.strip() for o in self.cors_allowed_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    """Cached settings singleton — only reads .env once."""
    import secrets
    import sys
    import os
    s = Settings()
    
    # Resolve relative SQLite database URL to an absolute path next to executable or script
    if s.database_url.startswith("sqlite:///"):
        db_path = s.database_url.replace("sqlite:///", "")
        # If it doesn't contain a colon (like C:) and doesn't start with a slash or backslash, it is relative
        if ":" not in db_path and not db_path.startswith("/") and not db_path.startswith("\\"):
            if db_path.startswith("./"):
                db_path = db_path[2:]
            elif db_path.startswith(".\\"):
                db_path = db_path[2:]
                
            if getattr(sys, 'frozen', False):
                base_dir = os.path.dirname(os.path.abspath(sys.executable))
            else:
                base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            s.database_url = f"sqlite:///{os.path.join(base_dir, db_path)}"
            
    if not s.jwt_secret_key:
        s.jwt_secret_key = secrets.token_hex(32)
    return s


# Module-level singleton for simple imports:  from settings import settings
settings = get_settings()

