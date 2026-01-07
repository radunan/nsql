from fastapi import APIRouter, HTTPException, status, Depends
import json
from app.models.user import User
from app.core.schemas import UserResponse, UserUpdate
from app.core.dependencies import get_current_active_user
from app.db.redis import RedisClient
from app.data.drinks import ALCOHOLIC_DRINKS, DRINK_TYPES, CZECH_BEERS
from datetime import datetime


router = APIRouter(prefix="/api/users", tags=["Users"])


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    current_user: User = Depends(get_current_active_user)
):
    """
    Get current user's profile.
    
    Args:
        current_user: Authenticated user from dependency
        
    Returns:
        Current user profile
    """
    # Mark user as online for 5 minutes
    redis_client = RedisClient.get_client()
    await redis_client.setex(f"online:{current_user.id}", 300, "1")
    
    return UserResponse(
        id=str(current_user.id),
        username=current_user.username,
        email=current_user.email,
        bio=current_user.bio,
        favorite_drinks=current_user.favorite_drinks,
        sober_date=current_user.sober_date,
        days_sober=current_user.days_sober,
        created_at=current_user.created_at,
        is_active=current_user.is_active
    )


@router.get("/{username}", response_model=UserResponse)
async def get_user_profile(username: str):
    """
    Get user profile by username.
    
    Args:
        username: Username of the user to retrieve
        
    Returns:
        User profile
        
    Raises:
        HTTPException: If user not found
    """
    # Try cache first
    redis_client = RedisClient.get_client()
    cache_key = f"user:profile:{username}"
    cached = await redis_client.get(cache_key)
    if cached:
        return json.loads(cached)
    
    user = await User.find_one(User.username == username)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    response = UserResponse(
        id=str(user.id),
        username=user.username,
        email=user.email,
        bio=user.bio,
        favorite_drinks=user.favorite_drinks,
        sober_date=user.sober_date,
        days_sober=user.days_sober,
        created_at=user.created_at,
        is_active=user.is_active
    )
    
    # Cache for 5 minutes
    await redis_client.setex(cache_key, 300, json.dumps(response.model_dump(mode='json')))
    
    return response


@router.put("/me", response_model=UserResponse)
async def update_user_profile(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_active_user)
):
    """
    Update current user's profile.
    
    Args:
        user_update: Profile update data
        current_user: Authenticated user from dependency
        
    Returns:
        Updated user profile
    """
    # Update fields if provided
    if user_update.bio is not None:
        current_user.bio = user_update.bio
    
    if user_update.favorite_drinks is not None:
        current_user.favorite_drinks = user_update.favorite_drinks
    
    if user_update.sober_date is not None:
        current_user.sober_date = user_update.sober_date
    
    current_user.updated_at = datetime.utcnow()
    
    await current_user.save()
    
    # Invalidate user cache
    redis_client = RedisClient.get_client()
    await redis_client.delete(f"user:profile:{current_user.username}")
    
    return UserResponse(
        id=str(current_user.id),
        username=current_user.username,
        email=current_user.email,
        bio=current_user.bio,
        favorite_drinks=current_user.favorite_drinks,
        sober_date=current_user.sober_date,
        days_sober=current_user.days_sober,
        created_at=current_user.created_at,
        is_active=current_user.is_active
    )


@router.get("/drinks/list")
async def get_drinks_list():
    """
    Get list of available alcoholic drinks for selection.
    
    Returns:
        List of alcoholic drink names
    """
    return {"drinks": ALCOHOLIC_DRINKS}


@router.get("/drinks/types")
async def get_drink_types():
    """
    Get list of alcohol types (categories).
    
    Returns:
        List of drink types/categories
    """
    return {"types": DRINK_TYPES}


@router.get("/drinks/czech-beers")
async def get_czech_beers():
    """
    Get list of Czech beers.
    
    Returns:
        List of Czech beer brands
    """
    return {"beers": CZECH_BEERS}
