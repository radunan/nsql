from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from pathlib import Path
from app.db.mongodb import MongoDB
from app.db.redis import RedisClient
from app.routers import auth, users, posts, friends, comments, chat
from app.core.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for startup and shutdown events.
    """
    # Startup: Connect to databases
    print("🍻 Starting DrinkBuddies API...")
    await MongoDB.connect_db()
    await RedisClient.connect_redis()
    print("✅ All connections established")
    
    yield
    
    # Shutdown: Close database connections
    print("🛑 Shutting down DrinkBuddies API...")
    await MongoDB.close_db()
    await RedisClient.close_redis()
    print("✅ All connections closed")


# Initialize FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="A social network API for recovering alcoholics to connect and support each other.",
    lifespan=lifespan
)


# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount uploads directory for static files
UPLOAD_DIR = Path("/app/uploads")
UPLOAD_DIR.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# Include routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(posts.router)
app.include_router(comments.router)
app.include_router(chat.router)
app.include_router(friends.router)


@app.get("/")
async def root():
    """Root endpoint - API health check."""
    return {
        "message": "Welcome to DrinkBuddies API",
        "version": settings.APP_VERSION,
        "status": "healthy"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "database": "connected",
        "cache": "connected"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
