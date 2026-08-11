"""Quote requests: anyone can submit one, administrators work through them."""

from datetime import datetime, timezone
from math import ceil
from secrets import token_hex
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, or_, select

from ..auth import CurrentAdmin, CurrentUser, DbSession
from ..models import Product, Quote, QuoteStatus, User
from ..schemas import QuoteCreate, QuoteOut, QuotePage, QuoteUpdate, Stats

public = APIRouter(prefix="/api/quotes", tags=["quotes"])
admin = APIRouter(prefix="/api/admin", tags=["admin"])


def make_reference() -> str:
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d")
    return f"SC-{stamp}-{token_hex(2).upper()}"


@public.post("", response_model=QuoteOut, status_code=status.HTTP_201_CREATED)
def submit_quote(body: QuoteCreate, db: DbSession) -> QuoteOut:
    """Accept a quote request.

    Deliberately open: a customer should not need an account to ask for a price.
    If the email matches a registered user the quote is linked to them so it
    appears in their history, but that is a convenience, not a requirement.
    """
    user = db.query(User).filter(User.email == body.contact_email.lower()).first()

    quote = Quote(
        reference=make_reference(),
        user_id=user.id if user else None,
        contact_name=body.contact_name,
        contact_email=body.contact_email.lower(),
        organisation=body.organisation,
        phone=body.phone,
        city=body.city,
        timeline=body.timeline,
        target=body.target,
        workloads=body.workloads,
        notes=body.notes,
        lines=[line.model_dump() for line in body.lines],
        summary=body.summary,
        findings=body.findings,
    )
    db.add(quote)
    db.commit()
    db.refresh(quote)
    return QuoteOut.model_validate(quote)


@public.get("/mine", response_model=list[QuoteOut])
def my_quotes(user: CurrentUser, db: DbSession) -> list[QuoteOut]:
    """The signed-in user's own quote requests, newest first.

    Matched on the email as well as the account id, so a request sent before
    the account existed still shows up once they register with that address.
    """
    rows = db.scalars(
        select(Quote)
        .where(or_(Quote.user_id == user.id, Quote.contact_email == user.email))
        .order_by(Quote.created_at.desc())
        .limit(50)
    ).all()
    return [QuoteOut.model_validate(r) for r in rows]


@admin.get("/quotes", response_model=QuotePage)
def list_quotes(
    db: DbSession,
    _: CurrentAdmin,
    status_filter: str | None = Query(default=None, alias="status"),
    q: str | None = None,
    page: Annotated[int, Query(ge=1)] = 1,
    per_page: Annotated[int, Query(ge=1, le=100)] = 25,
) -> QuotePage:
    stmt = select(Quote)
    if status_filter:
        stmt = stmt.where(Quote.status == status_filter)
    if q:
        like = f"%{q.lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(Quote.reference).like(like),
                func.lower(Quote.contact_name).like(like),
                func.lower(Quote.contact_email).like(like),
                func.lower(func.coalesce(Quote.organisation, "")).like(like),
            )
        )
    stmt = stmt.order_by(Quote.created_at.desc())

    total = db.scalar(stmt.with_only_columns(func.count(Quote.id)).order_by(None)) or 0
    rows = db.scalars(stmt.limit(per_page).offset((page - 1) * per_page)).all()
    return QuotePage(
        items=[QuoteOut.model_validate(r) for r in rows],
        total=total,
        page=page,
        pages=max(1, ceil(total / per_page)),
    )


@admin.get("/quotes/{reference}", response_model=QuoteOut)
def get_quote(reference: str, db: DbSession, _: CurrentAdmin) -> QuoteOut:
    row = db.query(Quote).filter(Quote.reference == reference).first()
    if row is None:
        raise HTTPException(status_code=404, detail="No such quote.")
    return QuoteOut.model_validate(row)


@admin.patch("/quotes/{reference}", response_model=QuoteOut)
def update_quote(reference: str, body: QuoteUpdate, db: DbSession, _: CurrentAdmin) -> QuoteOut:
    row = db.query(Quote).filter(Quote.reference == reference).first()
    if row is None:
        raise HTTPException(status_code=404, detail="No such quote.")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(row, field, value)
    db.commit()
    db.refresh(row)
    return QuoteOut.model_validate(row)


@admin.get("/stats", response_model=Stats)
def stats(db: DbSession, _: CurrentAdmin) -> Stats:
    by_kind = dict(
        db.execute(
            select(Product.kind, func.count(Product.id))
            .where(Product.is_active.is_(True))
            .group_by(Product.kind)
            .order_by(func.count(Product.id).desc())
        ).all()
    )
    return Stats(
        products_total=db.scalar(select(func.count(Product.id))) or 0,
        products_active=db.scalar(select(func.count(Product.id)).where(Product.is_active.is_(True))) or 0,
        products_in_stock=db.scalar(select(func.count(Product.id)).where(Product.stock_qty > 0)) or 0,
        quotes_total=db.scalar(select(func.count(Quote.id))) or 0,
        quotes_new=db.scalar(select(func.count(Quote.id)).where(Quote.status == QuoteStatus.new)) or 0,
        users_total=db.scalar(select(func.count(User.id))) or 0,
        by_kind=by_kind,
    )
