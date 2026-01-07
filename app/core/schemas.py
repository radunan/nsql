from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime


# Request schemas
class UserRegister(BaseModel):
    """Schema for user registration."""
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=100)
    bio: Optional[str] = Field(None, max_length=500)
    favorite_drinks: Optional[List[str]] = Field(default_factory=list)
    sober_date: Optional[datetime] = None


class UserLogin(BaseModel):
    """Schema for user login."""
    username: str
    password: str


class UserUpdate(BaseModel):
    """Schema for updating user profile."""
    bio: Optional[str] = Field(None, max_length=500)
    favorite_drinks: Optional[List[str]] = None
    sober_date: Optional[datetime] = None


# Response schemas
class UserResponse(BaseModel):
    """Schema for user response."""
    id: str
    username: str
    email: EmailStr
    bio: Optional[str]
    favorite_drinks: List[str] = Field(default_factory=list)
    sober_date: Optional[datetime]
    days_sober: Optional[int]
    created_at: datetime
    is_active: bool
    
    class Config:
        from_attributes = True


class Token(BaseModel):
    """Schema for token response."""
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Schema for token payload data."""
    username: Optional[str] = None
