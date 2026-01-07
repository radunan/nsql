import redis.asyncio as redis
from typing import Optional
from app.core.config import settings


class RedisClient:
    """Redis connection manager."""
    
    client: Optional[redis.Redis] = None
    pubsub: Optional[redis.client.PubSub] = None
    
    @classmethod
    async def connect_redis(cls):
        """Initialize Redis connection pool."""
        cls.client = await redis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True
        )
        
        # Test connection
        await cls.client.ping()
        print(f"✅ Connected to Redis at {settings.REDIS_URL}")
    
    @classmethod
    async def close_redis(cls):
        """Close Redis connection."""
        if cls.client:
            await cls.client.close()
            print("❌ Redis connection closed")
    
    @classmethod
    def get_client(cls) -> redis.Redis:
        """Get Redis client instance."""
        if not cls.client:
            raise RuntimeError("Redis client not initialized")
        return cls.client


# Convenience function
async def get_redis() -> redis.Redis:
    """Dependency to get Redis client."""
    return RedisClient.get_client()
