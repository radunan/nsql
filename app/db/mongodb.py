from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.core.config import settings
from typing import Optional


class MongoDB:
    """MongoDB connection manager."""
    
    client: Optional[AsyncIOMotorClient] = None
    
    @classmethod
    async def connect_db(cls):
        """Initialize MongoDB connection and Beanie ODM."""
        cls.client = AsyncIOMotorClient(settings.MONGODB_URL)
        
        # Import models here to avoid circular imports
        from app.models.user import User
        from app.models.post import Post
        from app.models.comment import Comment
        from app.models.message import Message
        from app.models.friendship import Friendship, PrivateMessage
        
        # Initialize Beanie with document models
        await init_beanie(
            database=cls.client[settings.DATABASE_NAME],
            document_models=[User, Post, Comment, Message, Friendship, PrivateMessage]
        )
        
        print(f"✅ Connected to MongoDB at {settings.MONGODB_URL}")
    
    @classmethod
    async def close_db(cls):
        """Close MongoDB connection."""
        if cls.client:
            cls.client.close()
            print("❌ MongoDB connection closed")


# Convenience functions
async def get_database():
    """Get database instance."""
    return MongoDB.client[settings.DATABASE_NAME]
