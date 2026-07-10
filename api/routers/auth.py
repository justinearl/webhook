import logging

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import models, schemas
from ..db import get_db
from ..security import create_access_token, get_current_user, verify_google_credential

logger = logging.getLogger("webhook.auth")

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=schemas.LoginResponse)
def login(payload: schemas.GoogleLoginRequest, db: Session = Depends(get_db)):
    claims = verify_google_credential(payload.credential)

    google_sub = claims["sub"]
    email = claims.get("email", "")
    name = claims.get("name", "")
    picture = claims.get("picture", "")

    user = db.query(models.User).filter(models.User.google_sub == google_sub).first()
    if user is None:
        # Fall back to matching by email in case the account already existed.
        user = db.query(models.User).filter(models.User.email == email).first()

    is_new_user = user is None
    if is_new_user:
        user = models.User(email=email, name=name, picture=picture, google_sub=google_sub)
        db.add(user)
    else:
        user.name = name
        user.picture = picture
        user.google_sub = google_sub

    db.commit()
    db.refresh(user)

    logger.info(
        "New user signed up" if is_new_user else "User logged in",
        extra={"user_id": user.id, "email": user.email, "is_new_user": is_new_user},
    )

    token = create_access_token(user.id)
    return schemas.LoginResponse(access_token=token, user=schemas.UserOut.model_validate(user))


@router.get("/me", response_model=schemas.UserOut)
def me(current_user: models.User = Depends(get_current_user)):
    return current_user
