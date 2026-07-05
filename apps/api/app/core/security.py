from __future__ import annotations

import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone

from jose import jwt

from app.core.config import settings

ALGORITHM = "HS256"


def hash_password(password: str, salt: str | None = None) -> str:
    actual_salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), actual_salt.encode("utf-8"), 120_000
    ).hex()
    return f"{actual_salt}${digest}"


def verify_password(password: str, password_hash: str) -> bool:
    salt, expected = password_hash.split("$", 1)
    candidate = hash_password(password, salt).split("$", 1)[1]
    return hmac.compare_digest(candidate, expected)


def create_access_token(subject: str, workspace_id: str) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(hours=8)
    payload = {"sub": subject, "workspace_id": workspace_id, "exp": expires_at}
    return jwt.encode(payload, settings.jwt_secret, algorithm=ALGORITHM)

