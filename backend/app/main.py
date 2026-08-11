"""Application entry point.

Creates the tables, makes sure an administrator exists, loads the catalog on
first boot, and mounts the routers. Interactive API documentation is at /docs.
"""

import json
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, select

from .auth import hash_password
from .config import get_settings
from .db import Base, SessionLocal, engine
from .models import Product, Role, User
from .routers import auth as auth_router
from .routers import products as products_router
from .routers import quotes as quotes_router

log = logging.getLogger("uvicorn.error")
settings = get_settings()

SEED_FILE = Path(__file__).resolve().parent.parent / "seed" / "catalog.json"


def ensure_admin(db) -> None:
    existing = db.query(User).filter(User.email == settings.admin_email.lower()).first()
    if existing:
        return
    db.add(
        User(
            email=settings.admin_email.lower(),
            password_hash=hash_password(settings.admin_password),
            full_name="Administrator",
            role=Role.admin,
        )
    )
    db.commit()
    log.info("Created the first administrator: %s", settings.admin_email)


def seed_catalog(db) -> None:
    """Load the generated catalog once, on an empty database.

    The frontend generates the catalog deterministically; this imports that
    output so the database is the source of truth from then on and the admin
    can edit it. Existing rows are never touched.
    """
    if db.scalar(select(func.count(Product.id))):
        return
    if not SEED_FILE.exists():
        log.warning("No seed file at %s, starting with an empty catalog.", SEED_FILE)
        return

    payload = json.loads(SEED_FILE.read_text(encoding="utf-8"))
    db.bulk_save_objects([Product(**row) for row in payload])
    db.commit()
    log.info("Seeded %d products.", len(payload))


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        ensure_admin(db)
        seed_catalog(db)
    yield


app = FastAPI(
    title="Supercomputers API",
    version="1.0.0",
    summary="Catalog, accounts and quote requests for the Supercomputers storefront.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(products_router.public)
app.include_router(products_router.admin)
app.include_router(quotes_router.public)
app.include_router(quotes_router.admin)


@app.get("/api/health", tags=["meta"])
def health() -> dict:
    """Used by the container healthcheck and by the frontend to show status."""
    with SessionLocal() as db:
        products = db.scalar(select(func.count(Product.id))) or 0
    return {"status": "ok", "products": products, "environment": settings.environment}
