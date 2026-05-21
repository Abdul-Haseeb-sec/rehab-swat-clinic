"""
database.py — SQLAlchemy engine and session factory for Rehab Swat CMS.

Database URL is loaded exclusively from settings (which reads from .env).
PostgreSQL is the only supported production database.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from settings import settings

# ── Engine ────────────────────────────────────────────────────────────────────
# connect_args is only needed for SQLite. PostgreSQL handles concurrency natively.
_connect_args = {}
if settings.database_url.startswith("sqlite"):
    _connect_args = {"check_same_thread": False}

# Ensure postgresql+psycopg dialect for psycopg3
_db_url = settings.database_url
if _db_url.startswith("postgresql://") and "+psycopg" not in _db_url:
    _db_url = _db_url.replace("postgresql://", "postgresql+psycopg://", 1)

_pool_kwargs: dict = {}
if not _db_url.startswith("sqlite"):
    _pool_kwargs = {"pool_size": 10, "max_overflow": 20}

engine = create_engine(
    _db_url,
    connect_args=_connect_args,
    pool_pre_ping=True,
    **_pool_kwargs,
)

# ── Session factory ───────────────────────────────────────────────────────────
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# ── Declarative base (imported by all models) ─────────────────────────────────
Base = declarative_base()


# ── FastAPI dependency ────────────────────────────────────────────────────────
def get_db():
    """
    Yield a database session and guarantee cleanup.

    Usage in route:
        db: Session = Depends(get_db)
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
