from beanie import Document
from datetime import datetime
from typing import Optional
from pydantic import Field


class Friendship(Document):
    """
    Friendship model representing connection between two users.
    """
    user_id: str = Field(..., description="ID of user who sent friend request")
    friend_id: str = Field(..., description="ID of user who received request")
    status: str = Field(default="pending", description="pending, accepted, rejected")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    
    class Settings:
        name = "Friendship"
        
    class Config:
        json_schema_extra = {
            "example": {
                "user_id": "user123",
                "friend_id": "user456",
                "status": "accepted"
            }
        }


class PrivateMessage(Document):
    """
    Private message between two users.
    """
    sender_id: str = Field(..., description="ID of message sender")
    sender_username: str
    receiver_id: str = Field(..., description="ID of message receiver")
    receiver_username: str
    message: str = Field(..., min_length=1, max_length=2000)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    read: bool = Field(default=False)
    
    class Settings:
        name = "PrivateMessage"
        
    class Config:
        json_schema_extra = {
            "example": {
                "sender_id": "user123",
                "sender_username": "john",
                "receiver_id": "user456",
                "receiver_username": "jane",
                "message": "Hey, how are you?"
            }
        }
