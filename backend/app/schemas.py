"""Request and response shapes.

These are the API contract. FastAPI turns them into the OpenAPI docs at /docs,
so keeping them tidy is also keeping the documentation tidy.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from .models import QuoteStatus, Role

# ------------------------------------------------------------------- auth


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, description="At least 8 characters.")
    full_name: str | None = None
    organisation: str | None = None
    phone: str | None = None


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    full_name: str | None
    organisation: str | None
    phone: str | None
    role: Role
    is_active: bool
    created_at: datetime


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---------------------------------------------------------------- products


class ProductBase(BaseModel):
    sku: str
    slug: str
    kind: str
    brand: str
    model: str
    mpn: str | None = None
    family: str = ""
    condition: str = "new"
    segment: str = "datacenter"
    price_pkr: float = 0
    price_on_request: bool = False
    stock_qty: int = 0
    lead_days: int = 0
    indent_only: bool = False
    warranty_months: int = 12
    release_year: int = 2024
    search_key: str = ""
    highlights: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    specs: dict[str, Any] = Field(default_factory=dict)
    is_active: bool = True


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    """Every field optional — this is a PATCH, not a replace."""

    slug: str | None = None
    kind: str | None = None
    brand: str | None = None
    model: str | None = None
    mpn: str | None = None
    family: str | None = None
    condition: str | None = None
    segment: str | None = None
    price_pkr: float | None = None
    price_on_request: bool | None = None
    stock_qty: int | None = None
    lead_days: int | None = None
    indent_only: bool | None = None
    warranty_months: int | None = None
    release_year: int | None = None
    search_key: str | None = None
    highlights: list[str] | None = None
    tags: list[str] | None = None
    specs: dict[str, Any] | None = None
    is_active: bool | None = None


class ProductOut(ProductBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class ProductPage(BaseModel):
    items: list[ProductOut]
    total: int
    page: int
    pages: int


# ------------------------------------------------------------------ quotes


class QuoteLine(BaseModel):
    sku: str
    qty: int = 1
    brand: str = ""
    model: str = ""
    kind: str = ""
    condition: str = ""


class QuoteCreate(BaseModel):
    contact_name: str
    contact_email: EmailStr
    organisation: str | None = None
    phone: str | None = None
    city: str | None = None
    timeline: str | None = None
    target: str = "desk"
    workloads: list[str] = Field(default_factory=list)
    notes: str | None = None
    lines: list[QuoteLine] = Field(default_factory=list)
    summary: dict[str, Any] = Field(default_factory=dict)
    findings: list[dict[str, Any]] = Field(default_factory=list)


class QuoteUpdate(BaseModel):
    status: QuoteStatus | None = None
    internal_note: str | None = None


class QuoteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    reference: str
    contact_name: str
    contact_email: EmailStr
    organisation: str | None
    phone: str | None
    city: str | None
    timeline: str | None
    target: str
    workloads: list[Any]
    notes: str | None
    lines: list[Any]
    summary: dict[str, Any]
    findings: list[Any]
    status: QuoteStatus
    internal_note: str | None
    created_at: datetime


class QuotePage(BaseModel):
    items: list[QuoteOut]
    total: int
    page: int
    pages: int


class Stats(BaseModel):
    products_total: int
    products_active: int
    products_in_stock: int
    quotes_total: int
    quotes_new: int
    users_total: int
    by_kind: dict[str, int]
