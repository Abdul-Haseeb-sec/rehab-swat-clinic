"""
alembic/env.py — Alembic migration environment for Rehab Swat CMS.

Configured to:
  - Load DATABASE_URL from settings (reads .env)
  - Use SQLAlchemy models' Base.metadata for autogenerate support
  - Support both online (connected) and offline (SQL script) migrations
"""
import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from alembic import context

# ── Add backend/ to sys.path so models, settings, database can be imported ───
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from settings import settings
from database import Base

# ── Import all models so Alembic sees them for autogenerate ──────────────────
import models  # noqa: F401 — side-effect import registers all ORM classes

# ── Alembic Config ────────────────────────────────────────────────────────────
config = context.config

# Override the sqlalchemy.url from alembic.ini with our env-loaded URL
db_url = settings.database_url
if db_url.startswith("postgresql://") and "+psycopg" not in db_url:
    db_url = db_url.replace("postgresql://", "postgresql+psycopg://", 1)
config.set_main_option("sqlalchemy.url", db_url)

# Interpret the config file for Python logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Provide the metadata for autogenerate
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode — emit SQL to stdout without DB connection."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode — connect to DB and apply."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,           # Detect column type changes
            compare_server_default=True, # Detect server default changes
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
