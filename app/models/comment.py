from beanie import Document, Link, PydanticObjectId
from pydantic import Field
from datetime import datetime
from typing import Optional
from app.models.user import User
from app.models.post import Post


class Comment(Document):
    """Comment model for posts."""
    
    content: str = Field(..., min_length=1, max_length=1000)
    author: Link[User]  # Reference to User document
    post_id: PydanticObjectId  # Reference to Post
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "comments"
        indexes = [
            [("post_id", 1), ("created_at", 1)],  # Index for fetching comments by post
        ]
    
    class Config:
        json_schema_extra = {
            "example": {
                "content": "Great progress! Keep it up!",
            }
        }
