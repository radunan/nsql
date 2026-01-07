from beanie import Document, Indexed
from pydantic import EmailStr, Field
from datetime import datetime
from typing import Optional, List


class User(Document):
    """User model for authentication and profile."""
    
    username: Indexed(str, unique=True)  # type: ignore
    email: Indexed(EmailStr, unique=True)  # type: ignore
    hashed_password: str
    bio: Optional[str] = None
    favorite_drinks: List[str] = Field(default_factory=list)  # List of favorite alcohol types
    sober_date: Optional[datetime] = None  # Date when user started sobriety
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True
    
    class Settings:
        name = "users"
        indexes = [
            "username",
            "email",
        ]
    
    @property
    def days_sober(self) -> Optional[int]:
        """Calculate days sober since sober_date."""
        if self.sober_date:
            delta = datetime.utcnow() - self.sober_date
            return delta.days
        return None
    
    class Config:
        json_schema_extra = {
            "example": {
                "username": "john_doe",
                "email": "john@example.com",
                "bio": "Day by day, staying strong!",
                "sober_date": "2024-01-01T00:00:00"
            }
        }
