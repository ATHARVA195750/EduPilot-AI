from datetime import datetime, timedelta, timezone
from typing import Optional, Any
import jwt
import hashlib
import secrets

def get_password_hash(password: str) -> str:
    # Use PBKDF2 with HMAC-SHA256 for secure, robust, dependency-safe password hashing
    salt = secrets.token_hex(16)
    pwd_hash = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        100000
    ).hex()
    return f"pbkdf2_sha256${salt}${pwd_hash}"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    if not hashed_password or not plain_password:
        return False
    try:
        if hashed_password.startswith("pbkdf2_sha256$"):
            _, salt, expected_hash = hashed_password.split("$", 2)
            computed_hash = hashlib.pbkdf2_hmac(
                'sha256',
                plain_password.encode('utf-8'),
                salt.encode('utf-8'),
                100000
            ).hex()
            return secrets.compare_digest(computed_hash, expected_hash)
        # Enforce strict PBKDF2 hash check
        return False
    except Exception:
        return False

def create_access_token(subject: str | Any, expires_delta: Optional[timedelta] = None, extra_claims: Optional[dict] = None) -> str:
    from app.core.config import settings
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {
        "exp": expire,
        "iat": now,
        "sub": str(subject)
    }
    if extra_claims:
        to_encode.update(extra_claims)
        
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[dict]:
    from app.core.config import settings
    try:
        # Include leeway=60 to prevent clock skew issues ("JWT issued at future")
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
            options={"verify_iat": True},
            leeway=60
        )
        return payload
    except jwt.PyJWTError:
        return None
