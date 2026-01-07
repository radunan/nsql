from fastapi import APIRouter, HTTPException, status, Depends, Query, UploadFile, File, Form
from typing import List, Optional
import os
import uuid
import json
from pathlib import Path
from app.models.post import Post
from app.models.user import User
from app.core.post_schemas import PostCreate, PostUpdate, PostResponse
from app.core.dependencies import get_current_active_user, get_optional_user
from app.db.redis import RedisClient
from datetime import datetime
from beanie import PydanticObjectId


router = APIRouter(prefix="/api/posts", tags=["Posts"])

# Create uploads directory
UPLOAD_DIR = Path("/app/uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


@router.post("/upload-image")
async def upload_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user)
):
    """Upload image for post."""
    # Validate file type
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Generate unique filename
    file_extension = file.filename.split(".")[-1]
    unique_filename = f"{uuid.uuid4()}.{file_extension}"
    file_path = UPLOAD_DIR / unique_filename
    
    # Save file
    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
    
    # Return URL (in production, this would be a CDN URL)
    return {"image_url": f"/uploads/{unique_filename}"}


@router.post("/", response_model=PostResponse, status_code=status.HTTP_201_CREATED)
async def create_post(
    content: str = Form(...),
    image_url: Optional[str] = Form(None),
    current_user: User = Depends(get_current_active_user)
):
    """
    Create a new post with optional image.
    
    Args:
        content: Post content
        image_url: Optional image URL from upload
        current_user: Authenticated user from dependency
        
    Returns:
        Created post
    """
    # Rate limiting: max 10 posts per minute
    redis_client = RedisClient.get_client()
    rate_key = f"rate_limit:post:{current_user.id}"
    post_count = await redis_client.incr(rate_key)
    if post_count == 1:
        await redis_client.expire(rate_key, 60)
    if post_count > 10:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many posts. Please wait a moment."
        )
    
    new_post = Post(
        content=content,
        author=current_user,
        image_url=image_url
    )
    
    await new_post.insert()
    
    # Invalidate posts cache
    await redis_client.delete("posts:feed:*")
    
    return PostResponse(
        id=str(new_post.id),
        content=new_post.content,
        author_username=current_user.username,
        author_id=str(current_user.id),
        created_at=new_post.created_at,
        updated_at=new_post.updated_at,
        likes_count=new_post.likes_count,
        comments_count=new_post.comments_count,
        image_url=new_post.image_url,
        liked_by_user=False
    )


@router.get("/", response_model=List[PostResponse])
async def get_posts(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """
    Get posts in chronological order (newest first).
    
    Args:
        skip: Number of posts to skip (for pagination)
        limit: Maximum number of posts to return
        current_user: Optional authenticated user
        
    Returns:
        List of posts
    """
    # Try to get from cache first (only for first page)
    redis_client = RedisClient.get_client()
    user_id = str(current_user.id) if current_user else "anonymous"
    cache_key = f"posts:feed:{user_id}:{skip}:{limit}"
    
    if skip == 0:  # Only cache first page
        cached = await redis_client.get(cache_key)
        if cached:
            return json.loads(cached)
    
    posts = await Post.find_all().sort("-created_at").skip(skip).limit(limit).to_list()
    
    response = []
    for post in posts:
        # Fetch author information
        await post.fetch_link(Post.author)
        author = post.author
        
        # Check if current user has liked this post
        liked_by_user = False
        if current_user and current_user.id in post.liked_by:
            liked_by_user = True
        
        response.append(PostResponse(
            id=str(post.id),
            content=post.content,
            author_username=author.username,
            author_id=str(author.id),
            created_at=post.created_at,
            updated_at=post.updated_at,
            likes_count=post.likes_count,
            comments_count=post.comments_count,
            image_url=post.image_url,
            liked_by_user=liked_by_user
        ))
    
    # Cache first page for 2 minutes
    if skip == 0:
        await redis_client.setex(cache_key, 120, json.dumps([r.model_dump(mode='json') for r in response]))
    
    return response


@router.get("/{post_id}", response_model=PostResponse)
async def get_post(
    post_id: str,
    current_user: Optional[User] = Depends(get_optional_user)
):
    """
    Get a specific post by ID.
    
    Args:
        post_id: Post ID
        current_user: Optional authenticated user
        
    Returns:
        Post details
        
    Raises:
        HTTPException: If post not found
    """
    try:
        post = await Post.get(PydanticObjectId(post_id))
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found"
        )
    
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found"
        )
    
    # Fetch author information
    await post.fetch_link(Post.author)
    author = post.author
    
    # Check if current user has liked this post
    liked_by_user = False
    if current_user and current_user.id in post.liked_by:
        liked_by_user = True
    
    return PostResponse(
        id=str(post.id),
        content=post.content,
        author_username=author.username,
        author_id=str(author.id),
        created_at=post.created_at,
        updated_at=post.updated_at,
        likes_count=post.likes_count,
        comments_count=post.comments_count,
        image_url=post.image_url,
        liked_by_user=liked_by_user
    )


@router.put("/{post_id}", response_model=PostResponse)
async def update_post(
    post_id: str,
    post_update: PostUpdate,
    current_user: User = Depends(get_current_active_user)
):
    """
    Update a post (only by the author).
    
    Args:
        post_id: Post ID
        post_update: Updated post content
        current_user: Authenticated user from dependency
        
    Returns:
        Updated post
        
    Raises:
        HTTPException: If post not found or user is not the author
    """
    try:
        post = await Post.get(PydanticObjectId(post_id))
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found"
        )
    
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found"
        )
    
    # Fetch author to check ownership
    await post.fetch_link(Post.author)
    
    if post.author.id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this post"
        )
    
    # Update post
    post.content = post_update.content
    post.updated_at = datetime.utcnow()
    await post.save()
    
    # Invalidate posts cache
    redis_client = RedisClient.get_client()
    await redis_client.delete("posts:feed:*")
    
    # Check if current user has liked this post
    liked_by_user = current_user.id in post.liked_by
    
    return PostResponse(
        id=str(post.id),
        content=post.content,
        author_username=post.author.username,
        author_id=str(post.author.id),
        created_at=post.created_at,
        updated_at=post.updated_at,
        likes_count=post.likes_count,
        comments_count=post.comments_count,
        image_url=post.image_url,
        liked_by_user=liked_by_user
    )


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post(
    post_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """
    Delete a post (only by the author).
    
    Args:
        post_id: Post ID
        current_user: Authenticated user from dependency
        
    Raises:
        HTTPException: If post not found or user is not the author
    """
    try:
        post = await Post.get(PydanticObjectId(post_id))
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found"
        )
    
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found"
        )
    
    # Fetch author to check ownership
    await post.fetch_link(Post.author)
    
    if post.author.id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this post"
        )
    
    await post.delete()
    
    # Invalidate posts cache
    redis_client = RedisClient.get_client()
    await redis_client.delete("posts:feed:*")


@router.post("/{post_id}/like", response_model=PostResponse)
async def toggle_like(
    post_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """
    Toggle like on a post. If user already liked, remove like. If not liked, add like.
    
    Args:
        post_id: Post ID
        current_user: Authenticated user from dependency
        
    Returns:
        Updated post with new likes_count
        
    Raises:
        HTTPException: If post not found
    """
    try:
        post = await Post.get(PydanticObjectId(post_id))
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found"
        )
    
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found"
        )
    
    # Fetch author information
    await post.fetch_link(Post.author)
    author = post.author
    
    user_id = current_user.id
    
    # Toggle like
    if user_id in post.liked_by:
        # Unlike: remove user from liked_by list
        post.liked_by.remove(user_id)
        post.likes_count = max(0, post.likes_count - 1)
    else:
        # Like: add user to liked_by list
        post.liked_by.append(user_id)
        post.likes_count += 1
    
    await post.save()
    
    # Invalidate posts cache
    redis_client = RedisClient.get_client()
    await redis_client.delete("posts:feed:*")
    
    return PostResponse(
        id=str(post.id),
        content=post.content,
        author_username=author.username,
        author_id=str(author.id),
        created_at=post.created_at,
        updated_at=post.updated_at,
        likes_count=post.likes_count,
        comments_count=post.comments_count,
        image_url=post.image_url,
        liked_by_user=user_id in post.liked_by
    )
