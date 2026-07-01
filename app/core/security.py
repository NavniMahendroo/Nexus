import jwt
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
from typing import Union, Any

SECRET_KEY = "super-secret-key-for-nexus-app-portfolio-deduplication"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 120

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(subject: Union[str, Any], role: str, expires_delta: timedelta = None) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {
        "exp": expire,
        "sub": str(subject),
        "role": role
    }
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> dict:
    try:
        decoded_token = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        # Return payload if active
        if datetime.fromtimestamp(decoded_token["exp"], tz=timezone.utc) < datetime.now(timezone.utc):
            return None
        return decoded_token
    except jwt.PyJWTError:
        return None

from fastapi.security import OAuth2PasswordBearer
from fastapi import Depends, HTTPException, status

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def get_current_user_claims(token: str = Depends(oauth2_scheme)) -> dict:
    claims = decode_access_token(token)
    if not claims:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials, token is invalid or expired.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return claims

def require_role(allowed_roles: list[str]):
    def dependency(claims: dict = Depends(get_current_user_claims)):
        user_role = claims.get("role")
        if user_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: insufficient permissions."
            )
        return claims
    return dependency
