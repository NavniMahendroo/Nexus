import os
import jwt
import bcrypt
from datetime import datetime, timedelta, timezone
from typing import Union, Any

# Hot-patch passlib compatibility with modern bcrypt versions (which lack __about__)
if not hasattr(bcrypt, "__about__"):
    class BcryptAbout:
        __version__ = getattr(bcrypt, "__version__", "4.0.1")
    bcrypt.__about__ = BcryptAbout

# Hot-patch bcrypt.hashpw to truncate inputs > 72 bytes instead of raising ValueError.
# This makes passlib's startup wrap-bug check pass without throwing exceptions.
original_hashpw = bcrypt.hashpw
def wrapped_hashpw(password, salt):
    if isinstance(password, bytes) and len(password) > 72:
        password = password[:72]
    elif isinstance(password, str):
        encoded = password.encode('utf-8')
        if len(encoded) > 72:
            password = encoded[:72].decode('utf-8', errors='ignore')
    return original_hashpw(password, salt)
bcrypt.hashpw = wrapped_hashpw

from passlib.context import CryptContext
from dotenv import load_dotenv

# Ensure environment variables are loaded from .env
load_dotenv()

# Fail loudly if JWT_SECRET_KEY is missing from environment
if "JWT_SECRET_KEY" not in os.environ:
    raise KeyError("CRITICAL: JWT_SECRET_KEY environment variable is not defined.")

SECRET_KEY = os.environ["JWT_SECRET_KEY"]
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 120

# Configure passlib CryptContext to use bcrypt for secure password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain text password against a bcrypt hash."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Generate a bcrypt hash from a plain text password."""
    return pwd_context.hash(password)

def create_access_token(subject: Union[str, Any], role: str, expires_delta: timedelta = None, additional_claims: dict = None) -> str:
    """Create a signed JWT access token for authentication."""
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {
        "exp": expire,
        "sub": str(subject),
        "role": role
    }
    if additional_claims:
        to_encode.update(additional_claims)
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> dict:
    """Decode and validate a JWT access token."""
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
    """Dependency to retrieve and validate authenticated user claims from the JWT."""
    claims = decode_access_token(token)
    if not claims:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials, token is invalid or expired.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return claims

def require_role(allowed_roles: list[str]):
    """Authorization dependency to restrict endpoint access by allowed roles."""
    def dependency(claims: dict = Depends(get_current_user_claims)):
        user_role = claims.get("role")
        if user_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: insufficient permissions."
            )
        return claims
    return dependency
