from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from typing import Optional
from app.core.security import decode_access_token
from app.models.user import User


# OAuth2 scheme for token authentication
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    """
    Dependency to get the current authenticated user from JWT token.
    
    Args:
        token: JWT token from Authorization header
        
    Returns:
        Current authenticated User object
        
    Raises:
        HTTPException: If token is invalid or user not found
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # Decode token
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception
    
    # Extract username from token
    username: Optional[str] = payload.get("sub")
    if username is None:
        raise credentials_exception
    
    # Find user in database
    user = await User.find_one(User.username == username)
    if user is None:
        raise credentials_exception
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )
    
    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Dependency to get current active user.
    
    Args:
        current_user: User from get_current_user dependency
        
    Returns:
        Current active User object
    """
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


async def get_optional_user(token: Optional[str] = Depends(OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False))) -> Optional[User]:
    """
    Dependency to optionally get the current user if token is provided.
    Returns None if no token or invalid token.
    
    Args:
        token: Optional JWT token from Authorization header
        
    Returns:
        User object if authenticated, None otherwise
    """
    if token is None:
        return None
    
    try:
        payload = decode_access_token(token)
        if payload is None:
            return None
        
        username: Optional[str] = payload.get("sub")
        if username is None:
            return None
        
        user = await User.find_one(User.username == username)
        if user is None or not user.is_active:
            return None
        
        return user
    except Exception:
        return None
