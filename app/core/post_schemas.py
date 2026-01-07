from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


# Post schemas
class PostCreate(BaseModel):
    """Schema for creating a post."""
    content: str = Field(..., min_length=1, max_length=5000)


class PostUpdate(BaseModel):
    """Schema for updating a post."""
    content: str = Field(..., min_length=1, max_length=5000)


class PostResponse(BaseModel):
    """Schema for post response."""
    id: str
    content: str
    author_username: str
    author_id: str
    created_at: datetime
    updated_at: datetime
    likes_count: int
    comments_count: int = 0
    image_url: Optional[str] = None
    liked_by_user: bool = False  # Whether current user has liked this post
    
    class Config:
        from_attributes = True


# Comment schemas
class CommentCreate(BaseModel):
    """Schema for creating a comment."""
    content: str = Field(..., min_length=1, max_length=1000)


class CommentResponse(BaseModel):
    """Schema for comment response."""
    id: str
    content: str
    author_username: str
    author_id: str
    post_id: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# Message schemas
class MessageCreate(BaseModel):
    """Schema for creating a chat message."""
    content: str = Field(..., min_length=1, max_length=2000)
    room: str = "global"


class MessageResponse(BaseModel):
    """Schema for message response."""
    id: str
    content: str
    sender_username: str
    sender_id: str
    room: str
    created_at: datetime
    
    class Config:
        from_attributes = True
