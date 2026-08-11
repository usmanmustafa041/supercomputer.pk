"""Catalog reads for everyone, writes for administrators."""

from math import ceil
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, or_

from ..auth import CurrentAdmin, DbSession
from ..models import Product
from ..schemas import ProductCreate, ProductOut, ProductPage, ProductUpdate

public = APIRouter(prefix="/api/products", tags=["products"])
admin = APIRouter(prefix="/api/admin/products", tags=["admin"])


def _page(db, query, page: int, per_page: int) -> ProductPage:
    total = db.scalar(query.with_only_columns(func.count(Product.id)).order_by(None)) or 0
    rows = db.scalars(query.limit(per_page).offset((page - 1) * per_page)).all()
    return ProductPage(
        items=[ProductOut.model_validate(r) for r in rows],
        total=total,
        page=page,
        pages=max(1, ceil(total / per_page)),
    )


# ------------------------------------------------------------------ public


@public.get("", response_model=ProductPage)
def list_products(
    db: DbSession,
    kind: str | None = None,
    brand: str | None = None,
    condition: str | None = None,
    q: str | None = None,
    in_stock: bool = False,
    page: Annotated[int, Query(ge=1)] = 1,
    per_page: Annotated[int, Query(ge=1, le=100)] = 24,
) -> ProductPage:
    from sqlalchemy import select

    stmt = select(Product).where(Product.is_active.is_(True))
    if kind:
        stmt = stmt.where(Product.kind == kind)
    if brand:
        stmt = stmt.where(Product.brand == brand)
    if condition:
        stmt = stmt.where(Product.condition == condition)
    if in_stock:
        stmt = stmt.where(Product.stock_qty > 0)
    if q:
        like = f"%{q.lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(Product.model).like(like),
                func.lower(Product.brand).like(like),
                func.lower(Product.search_key).like(like),
                func.lower(Product.sku).like(like),
            )
        )
    stmt = stmt.order_by(Product.brand, Product.model)
    return _page(db, stmt, page, per_page)


@public.get("/{sku}", response_model=ProductOut)
def get_product(sku: str, db: DbSession) -> ProductOut:
    row = db.query(Product).filter(Product.sku == sku, Product.is_active.is_(True)).first()
    if row is None:
        raise HTTPException(status_code=404, detail="No such product.")
    return ProductOut.model_validate(row)


# ------------------------------------------------------------------- admin


@admin.get("", response_model=ProductPage)
def admin_list(
    db: DbSession,
    _: CurrentAdmin,
    kind: str | None = None,
    q: str | None = None,
    include_inactive: bool = True,
    page: Annotated[int, Query(ge=1)] = 1,
    per_page: Annotated[int, Query(ge=1, le=100)] = 25,
) -> ProductPage:
    from sqlalchemy import select

    stmt = select(Product)
    if not include_inactive:
        stmt = stmt.where(Product.is_active.is_(True))
    if kind:
        stmt = stmt.where(Product.kind == kind)
    if q:
        like = f"%{q.lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(Product.model).like(like),
                func.lower(Product.brand).like(like),
                func.lower(Product.sku).like(like),
            )
        )
    stmt = stmt.order_by(Product.updated_at.desc())
    return _page(db, stmt, page, per_page)


@admin.post("", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(body: ProductCreate, db: DbSession, _: CurrentAdmin) -> ProductOut:
    if db.query(Product).filter(Product.sku == body.sku).first():
        raise HTTPException(status_code=409, detail=f"SKU {body.sku} already exists.")
    if db.query(Product).filter(Product.slug == body.slug).first():
        raise HTTPException(status_code=409, detail=f"Slug {body.slug} already exists.")

    row = Product(**body.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return ProductOut.model_validate(row)


@admin.patch("/{sku}", response_model=ProductOut)
def update_product(sku: str, body: ProductUpdate, db: DbSession, _: CurrentAdmin) -> ProductOut:
    row = db.query(Product).filter(Product.sku == sku).first()
    if row is None:
        raise HTTPException(status_code=404, detail="No such product.")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(row, field, value)
    db.commit()
    db.refresh(row)
    return ProductOut.model_validate(row)


@admin.delete("/{sku}", status_code=status.HTTP_200_OK)
def delete_product(sku: str, db: DbSession, _: CurrentAdmin, hard: bool = False) -> dict:
    """Retire a product.

    The default is a soft delete: it disappears from the storefront but stays
    readable from the quotes that reference it. `hard=true` really removes the
    row, and is meant for mistakes rather than for discontinued stock.
    """
    row = db.query(Product).filter(Product.sku == sku).first()
    if row is None:
        raise HTTPException(status_code=404, detail="No such product.")

    if hard:
        db.delete(row)
        db.commit()
        return {"deleted": sku, "mode": "hard"}

    row.is_active = False
    db.commit()
    return {"deleted": sku, "mode": "retired"}


@admin.post("/{sku}/restore", response_model=ProductOut)
def restore_product(sku: str, db: DbSession, _: CurrentAdmin) -> ProductOut:
    row = db.query(Product).filter(Product.sku == sku).first()
    if row is None:
        raise HTTPException(status_code=404, detail="No such product.")
    row.is_active = True
    db.commit()
    db.refresh(row)
    return ProductOut.model_validate(row)
