"""Database tables.

The product table mirrors the shape the frontend catalog already uses: the
identifying and commercial columns are real columns so they can be filtered and
sorted in SQL, while the long tail of per-category engineering specs lives in a
JSONB `specs` column.

That split is deliberate. A GPU has vram_gb and a power supply has wattage; one
table with every column of every category would be mostly nulls, and a table per
category would need fifteen joins to list a catalog page. JSONB keeps one table
without pretending a switch and a DIMM have the same fields, and Postgres can
still index into it when a query needs to.
"""

from __future__ import annotations

import enum
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Role(str, enum.Enum):
    admin = "admin"
    customer = "customer"


class QuoteStatus(str, enum.Enum):
    new = "new"
    in_review = "in_review"
    quoted = "quoted"
    won = "won"
    lost = "lost"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    # Never the password itself. Argon2 hash, see auth.py.
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str | None] = mapped_column(String(120))
    organisation: Mapped[str | None] = mapped_column(String(160))
    phone: Mapped[str | None] = mapped_column(String(40))
    role: Mapped[Role] = mapped_column(Enum(Role, name="user_role"), default=Role.customer, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    quotes: Mapped[list[Quote]] = relationship(back_populates="user")


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    # The catalog SKU, e.g. G-06I3W4K. Stable across reseeds.
    sku: Mapped[str] = mapped_column(String(32), unique=True, index=True, nullable=False)
    slug: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)

    kind: Mapped[str] = mapped_column(String(32), index=True, nullable=False)
    brand: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    model: Mapped[str] = mapped_column(String(255), nullable=False)
    mpn: Mapped[str | None] = mapped_column(String(120))
    family: Mapped[str] = mapped_column(String(64), index=True, nullable=False)

    condition: Mapped[str] = mapped_column(String(24), index=True, nullable=False)
    segment: Mapped[str] = mapped_column(String(24), index=True, nullable=False)

    # Kept for the quotation even though no price is shown on the storefront.
    price_pkr: Mapped[float] = mapped_column(Numeric(14, 2), default=0, nullable=False)
    price_on_request: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    stock_qty: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    lead_days: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    indent_only: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    warranty_months: Mapped[int] = mapped_column(Integer, default=12, nullable=False)
    release_year: Mapped[int] = mapped_column(Integer, default=2024, nullable=False)

    search_key: Mapped[str] = mapped_column(String(255), default="", nullable=False)
    highlights: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    tags: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)

    # Per-category engineering fields. The compatibility engine reads these.
    specs: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)

    # Soft delete: a product referenced by an old quote must not vanish.
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    __table_args__ = (
        Index("ix_products_kind_active", "kind", "is_active"),
        Index("ix_products_specs", "specs", postgresql_using="gin"),
    )


class Quote(Base):
    __tablename__ = "quotes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    # Human reference printed on the requirement document, e.g. SC-20260812-A1B2.
    reference: Mapped[str] = mapped_column(String(32), unique=True, index=True, nullable=False)

    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    user: Mapped[User | None] = relationship(back_populates="quotes")

    # Captured inline so a request from someone without an account is complete.
    contact_name: Mapped[str] = mapped_column(String(120), nullable=False)
    contact_email: Mapped[str] = mapped_column(String(255), nullable=False)
    organisation: Mapped[str | None] = mapped_column(String(160))
    phone: Mapped[str | None] = mapped_column(String(40))
    city: Mapped[str | None] = mapped_column(String(80))
    timeline: Mapped[str | None] = mapped_column(String(60))

    target: Mapped[str] = mapped_column(String(16), default="desk", nullable=False)
    workloads: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)

    # A snapshot, not just SKU references: what the customer asked for must stay
    # readable even after a product is edited or retired.
    lines: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    summary: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    findings: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)

    status: Mapped[QuoteStatus] = mapped_column(
        Enum(QuoteStatus, name="quote_status"), default=QuoteStatus.new, index=True, nullable=False
    )
    internal_note: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )
