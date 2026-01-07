from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
import json
from app.core.dependencies import get_current_user
from app.core.friend_schemas import (
    FriendRequestCreate,
    FriendRequestResponse,
    PrivateMessageCreate,
    PrivateMessageResponse
)
from app.models.user import User
from app.models.friendship import Friendship, PrivateMessage
from app.db.redis import RedisClient
from datetime import datetime


router = APIRouter(prefix="/api/friends", tags=["Friends"])


@router.post("/request", response_model=FriendRequestResponse, status_code=status.HTTP_201_CREATED)
async def send_friend_request(
    request: FriendRequestCreate,
    current_user: User = Depends(get_current_user)
):
    """Send friend request to another user."""
    # Find the friend by username
    friend = await User.find_one(User.username == request.friend_username)
    if not friend:
        raise HTTPException(status_code=404, detail="User not found")
    
    if friend.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot send friend request to yourself")
    
    # Check if friendship already exists
    existing = await Friendship.find_one(
        {
            "$or": [
                {"user_id": str(current_user.id), "friend_id": str(friend.id)},
                {"user_id": str(friend.id), "friend_id": str(current_user.id)}
            ]
        }
    )
    
    if existing:
        raise HTTPException(status_code=400, detail="Friend request already exists")
    
    # Create friendship
    friendship = Friendship(
        user_id=str(current_user.id),
        friend_id=str(friend.id),
        status="pending"
    )
    await friendship.insert()
    
    # Invalidate friends cache
    redis_client = RedisClient.get_client()
    await redis_client.delete(f"friends:{current_user.id}")
    await redis_client.delete(f"friends:{friend.id}")
    
    return FriendRequestResponse(
        id=str(friendship.id),
        user_id=str(current_user.id),
        user_username=current_user.username,
        friend_id=str(friend.id),
        friend_username=friend.username,
        status=friendship.status,
        created_at=friendship.created_at
    )


@router.get("/requests", response_model=List[FriendRequestResponse])
async def get_friend_requests(current_user: User = Depends(get_current_user)):
    """Get pending friend requests."""
    requests = await Friendship.find(
        {"friend_id": str(current_user.id), "status": "pending"}
    ).to_list()
    
    result = []
    for req in requests:
        user = await User.get(req.user_id)
        if user:
            result.append(FriendRequestResponse(
                id=str(req.id),
                user_id=str(user.id),
                user_username=user.username,
                friend_id=str(current_user.id),
                friend_username=current_user.username,
                status=req.status,
                created_at=req.created_at
            ))
    
    return result


@router.post("/accept/{request_id}")
async def accept_friend_request(
    request_id: str,
    current_user: User = Depends(get_current_user)
):
    """Accept friend request."""
    friendship = await Friendship.get(request_id)
    if not friendship:
        raise HTTPException(status_code=404, detail="Friend request not found")
    
    if friendship.friend_id != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not your friend request")
    
    friendship.status = "accepted"
    friendship.updated_at = datetime.utcnow()
    await friendship.save()
    
    # Invalidate friends cache for both users
    redis_client = RedisClient.get_client()
    await redis_client.delete(f"friends:{current_user.id}")
    await redis_client.delete(f"friends:{friendship.user_id}")
    
    return {"message": "Friend request accepted"}


@router.post("/reject/{request_id}")
async def reject_friend_request(
    request_id: str,
    current_user: User = Depends(get_current_user)
):
    """Reject friend request."""
    friendship = await Friendship.get(request_id)
    if not friendship:
        raise HTTPException(status_code=404, detail="Friend request not found")
    
    if friendship.friend_id != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not your friend request")
    
    await friendship.delete()
    
    # Invalidate friends cache
    redis_client = RedisClient.get_client()
    await redis_client.delete(f"friends:{current_user.id}")
    await redis_client.delete(f"friends:{friendship.user_id}")
    
    return {"message": "Friend request rejected"}


@router.get("/list", response_model=List[dict])
async def get_friends(current_user: User = Depends(get_current_user)):
    """Get list of friends."""
    # Try cache first
    redis_client = RedisClient.get_client()
    cache_key = f"friends:{current_user.id}"
    cached = await redis_client.get(cache_key)
    if cached:
        return json.loads(cached)
    
    friendships = await Friendship.find(
        {
            "$or": [
                {"user_id": str(current_user.id), "status": "accepted"},
                {"friend_id": str(current_user.id), "status": "accepted"}
            ]
        }
    ).to_list()
    
    friends = []
    for friendship in friendships:
        friend_id = friendship.friend_id if friendship.user_id == str(current_user.id) else friendship.user_id
        friend = await User.get(friend_id)
        if friend:
            # Check if friend is online
            is_online = await redis_client.exists(f"online:{friend.id}")
            
            friends.append({
                "id": str(friend.id),
                "username": friend.username,
                "email": friend.email,
                "days_sober": friend.days_sober,
                "bio": friend.bio,
                "is_online": bool(is_online)
            })
    
    # Cache for 2 minutes
    await redis_client.setex(cache_key, 120, json.dumps(friends))
    
    return friends


@router.delete("/{friend_id}")
async def remove_friend(
    friend_id: str,
    current_user: User = Depends(get_current_user)
):
    """Remove friend."""
    friendship = await Friendship.find_one(
        {
            "$or": [
                {"user_id": str(current_user.id), "friend_id": friend_id, "status": "accepted"},
                {"user_id": friend_id, "friend_id": str(current_user.id), "status": "accepted"}
            ]
        }
    )
    
    if not friendship:
        raise HTTPException(status_code=404, detail="Friendship not found")
    
    # Get the other user's ID before deleting
    other_user_id = friendship.friend_id if friendship.user_id == str(current_user.id) else friendship.user_id
    
    await friendship.delete()
    
    # Invalidate friends cache
    redis_client = RedisClient.get_client()
    await redis_client.delete(f"friends:{current_user.id}")
    await redis_client.delete(f"friends:{other_user_id}")
    
    return {"message": "Friend removed"}


# Private Messages
@router.post("/messages", response_model=PrivateMessageResponse, status_code=status.HTTP_201_CREATED)
async def send_private_message(
    message_data: PrivateMessageCreate,
    current_user: User = Depends(get_current_user)
):
    """Send private message to friend."""
    receiver = await User.find_one(User.username == message_data.receiver_username)
    if not receiver:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if they are friends
    friendship = await Friendship.find_one(
        {
            "$or": [
                {"user_id": str(current_user.id), "friend_id": str(receiver.id), "status": "accepted"},
                {"user_id": str(receiver.id), "friend_id": str(current_user.id), "status": "accepted"}
            ]
        }
    )
    
    if not friendship:
        raise HTTPException(status_code=403, detail="Can only message friends")
    
    message = PrivateMessage(
        sender_id=str(current_user.id),
        sender_username=current_user.username,
        receiver_id=str(receiver.id),
        receiver_username=receiver.username,
        message=message_data.message
    )
    await message.insert()
    
    return PrivateMessageResponse(
        id=str(message.id),
        sender_id=message.sender_id,
        sender_username=message.sender_username,
        receiver_id=message.receiver_id,
        receiver_username=message.receiver_username,
        message=message.message,
        created_at=message.created_at,
        read=message.read
    )


@router.get("/messages/{friend_username}", response_model=List[PrivateMessageResponse])
async def get_conversation(
    friend_username: str,
    current_user: User = Depends(get_current_user)
):
    """Get conversation with friend."""
    friend = await User.find_one(User.username == friend_username)
    if not friend:
        raise HTTPException(status_code=404, detail="User not found")
    
    messages = await PrivateMessage.find(
        {
            "$or": [
                {"sender_id": str(current_user.id), "receiver_id": str(friend.id)},
                {"sender_id": str(friend.id), "receiver_id": str(current_user.id)}
            ]
        }
    ).sort("+created_at").to_list()
    
    # Mark as read
    for msg in messages:
        if msg.receiver_id == str(current_user.id) and not msg.read:
            msg.read = True
            await msg.save()
    
    return [
        PrivateMessageResponse(
            id=str(msg.id),
            sender_id=msg.sender_id,
            sender_username=msg.sender_username,
            receiver_id=msg.receiver_id,
            receiver_username=msg.receiver_username,
            message=msg.message,
            created_at=msg.created_at,
            read=msg.read
        )
        for msg in messages
    ]
