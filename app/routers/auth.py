from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from app.core.security import create_access_token, get_password_hash, verify_password

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    role: str
    username: str

# Simple mock database of users for demo/interview purposes
MOCK_USERS = {
    "admin": {
        "password_hash": get_password_hash("adminpassword"),
        "role": "admin"
    },
    "volunteer": {
        "password_hash": get_password_hash("volunteerpassword"),
        "role": "volunteer"
    }
}

@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest):
    """
    Minimal OAuth/JWT login route for demo users:
    - admin / adminpassword
    - volunteer / volunteerpassword
    """
    user_info = MOCK_USERS.get(payload.username)
    if not user_info:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password."
        )
        
    if not verify_password(payload.password, user_info["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password."
        )
        
    token = create_access_token(subject=payload.username, role=user_info["role"])
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user_info["role"],
        "username": payload.username
    }
