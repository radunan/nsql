from beanie import Document, Link, Indexed, PydanticObjectId
from pydantic import Field
from datetime import datetime
from typing import Optional, List
from app.models.user import User


class Post(Document):
    """Post model for social feed."""
    
    content: str = Field(..., min_length=1, max_length=5000)
    author: Link[User]  # Reference to User document
    image_url: Optional[str] = None  # URL to uploaded image
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    likes_count: int = 0
    liked_by: List[PydanticObjectId] = Field(default_factory=list)  # User IDs who liked this post
    comments_count: int = 0
    
    class Settings:
        name = "posts"
        indexes = [
            [("created_at", -1)],  # Index for chronological sorting
        ]
    
    class Config:
        json_schema_extra = {
            "example": {
                "content": "Celebrating 100 days sober today! Feeling grateful.",
                "likes_count": 0
            }
        }
