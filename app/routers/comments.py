from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import List
import json
from app.models.comment import Comment
from app.models.post import Post
from app.models.user import User
from app.core.post_schemas import CommentCreate, CommentResponse
from app.core.dependencies import get_current_active_user
from app.db.redis import RedisClient
from beanie import PydanticObjectId


router = APIRouter(prefix="/api/posts", tags=["Comments"])


@router.post("/{post_id}/comments", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
async def create_comment(
    post_id: str,
    comment_data: CommentCreate,
    current_user: User = Depends(get_current_active_user)
):
    """
    Create a new comment on a post.
    
    Args:
        post_id: Post ID
        comment_data: Comment content
        current_user: Authenticated user from dependency
        
    Returns:
        Created comment
        
    Raises:
        HTTPException: If post not found
    """
    # Rate limiting: max 20 comments per minute
    redis_client = RedisClient.get_client()
    rate_key = f"rate_limit:comment:{current_user.id}"
    comment_count = await redis_client.incr(rate_key)
    if comment_count == 1:
        await redis_client.expire(rate_key, 60)
    if comment_count > 20:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many comments. Please wait a moment."
        )
    
    # Verify post exists
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
    
    # Create comment
    new_comment = Comment(
        content=comment_data.content,
        author=current_user,
        post_id=PydanticObjectId(post_id)
    )
    
    await new_comment.insert()
    
    # Increment comments count on post
    post.comments_count += 1
    await post.save()
    
    # Invalidate comments and posts cache
    await redis_client.delete(f"comments:{post_id}")
    await redis_client.delete("posts:feed:*")
    
    return CommentResponse(
        id=str(new_comment.id),
        content=new_comment.content,
        author_username=current_user.username,
        author_id=str(current_user.id),
        post_id=post_id,
        created_at=new_comment.created_at,
        updated_at=new_comment.updated_at
    )


@router.get("/{post_id}/comments", response_model=List[CommentResponse])
async def get_comments(
    post_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100)
):
    """
    Get comments for a post.
    
    Args:
        post_id: Post ID
        skip: Number of comments to skip (for pagination)
        limit: Maximum number of comments to return
        
    Returns:
        List of comments
        
    Raises:
        HTTPException: If post not found
    """
    # Try to get from cache first (only for first page)
    redis_client = RedisClient.get_client()
    cache_key = f"comments:{post_id}:{skip}:{limit}"
    
    if skip == 0:  # Only cache first page
        cached = await redis_client.get(cache_key)
        if cached:
            return json.loads(cached)
    
    # Verify post exists
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
    
    # Fetch comments
    comments = await Comment.find(
        Comment.post_id == PydanticObjectId(post_id)
    ).sort("+created_at").skip(skip).limit(limit).to_list()
    
    response = []
    for comment in comments:
        # Fetch author information
        await comment.fetch_link(Comment.author)
        author = comment.author
        
        response.append(CommentResponse(
            id=str(comment.id),
            content=comment.content,
            author_username=author.username,
            author_id=str(author.id),
            post_id=str(comment.post_id),
            created_at=comment.created_at,
            updated_at=comment.updated_at
        ))
    
    # Cache first page for 2 minutes
    if skip == 0:
        await redis_client.setex(cache_key, 120, json.dumps([r.model_dump(mode='json') for r in response]))
    
    return response


@router.delete("/{post_id}/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(
    post_id: str,
    comment_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """
    Delete a comment (only by the author).
    
    Args:
        post_id: Post ID
        comment_id: Comment ID
        current_user: Authenticated user from dependency
        
    Raises:
        HTTPException: If comment not found or user is not the author
    """
    try:
        comment = await Comment.get(PydanticObjectId(comment_id))
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found"
        )
    
    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found"
        )
    
    # Verify comment belongs to post
    if str(comment.post_id) != post_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Comment does not belong to this post"
        )
    
    # Fetch author to check ownership
    await comment.fetch_link(Comment.author)
    
    if comment.author.id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this comment"
        )
    
    # Delete comment
    await comment.delete()
    
    # Decrement comments count on post
    try:
        post = await Post.get(PydanticObjectId(post_id))
        if post:
            post.comments_count = max(0, post.comments_count - 1)
            await post.save()
    except Exception:
        pass  # If post doesn't exist, just delete the comment
    
    # Invalidate comments and posts cache
    redis_client = RedisClient.get_client()
    await redis_client.delete(f"comments:{post_id}*")
    await redis_client.delete("posts:feed:*")
