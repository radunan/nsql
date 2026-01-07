from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class FriendRequestCreate(BaseModel):
    """Schema for creating friend request."""
    friend_username: str


class FriendRequestResponse(BaseModel):
    """Schema for friend request response."""
    id: str
    user_id: str
    user_username: str
    friend_id: str
    friend_username: str
    status: str
    created_at: datetime


class PrivateMessageCreate(BaseModel):
    """Schema for creating private message."""
    receiver_username: str
    message: str


class PrivateMessageResponse(BaseModel):
    """Schema for private message response."""
    id: str
    sender_id: str
    sender_username: str
    receiver_id: str
    receiver_username: str
    message: str
    created_at: datetime
    read: bool
