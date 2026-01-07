from beanie import Document, Link
from pydantic import Field
from datetime import datetime
from app.models.user import User


class Message(Document):
    """Message model for real-time chat."""
    
    content: str = Field(..., min_length=1, max_length=2000)
    sender: Link[User]  # Reference to User document
    room: str = "global"  # Chat room identifier (default: global chat)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "messages"
        indexes = [
            [("room", 1), ("created_at", -1)],  # Index for room-based queries
        ]
    
    class Config:
        json_schema_extra = {
            "example": {
                "content": "Hello everyone! Hope you're all doing well today.",
                "room": "global"
            }
        }
