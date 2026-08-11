"""Sign up, sign in, and "who am I".

One login endpoint for everyone. The role on the account decides what the
frontend shows and what the API allows — there is no separate admin login form,
because two doors into the same building is two doors to get wrong.
"""

from fastapi import APIRouter, HTTPException, status

from ..auth import CurrentUser, DbSession, create_access_token, hash_password, verify_password
from ..models import Role, User
from ..schemas import LoginRequest, RegisterRequest, TokenOut, UserOut

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest, db: DbSession) -> TokenOut:
    existing = db.query(User).filter(User.email == body.email.lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with that email already exists.",
        )

    # Self-registration always creates a customer. Admins are made by an admin,
    # so the endpoint cannot be used to grant yourself the portal.
    user = User(
        email=body.email.lower(),
        password_hash=hash_password(body.password),
        full_name=body.full_name,
        organisation=body.organisation,
        phone=body.phone,
        role=Role.customer,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return TokenOut(access_token=create_access_token(user), user=UserOut.model_validate(user))


@router.post("/login", response_model=TokenOut)
def login(body: LoginRequest, db: DbSession) -> TokenOut:
    user = db.query(User).filter(User.email == body.email.lower()).first()

    # Same message and same work whether the email exists or the password is
    # wrong, so the endpoint cannot be used to discover which emails are registered.
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email or password is incorrect.",
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This account is disabled.")

    return TokenOut(access_token=create_access_token(user), user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def me(user: CurrentUser) -> UserOut:
    return UserOut.model_validate(user)
