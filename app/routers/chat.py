from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from typing import List, Dict
from app.models.user import User
from app.models.friendship import PrivateMessage
from app.db.redis import RedisClient
from datetime import datetime
import json
import asyncio


router = APIRouter(prefix="/api/chat", tags=["Chat"])


class ConnectionManager:
    """Manages WebSocket connections for private messaging."""
    
    def __init__(self):
        # Store active connections: {room: [(user_id, websocket)]}
        self.active_connections: Dict[str, List[tuple]] = {}
    
    async def connect(self, websocket: WebSocket, user_id: str, room: str = "global"):
        """Accept a WebSocket connection and add to room."""
        await websocket.accept()
        
        if room not in self.active_connections:
            self.active_connections[room] = []
        
        # Check if this exact connection already exists
        for uid, ws in self.active_connections[room]:
            if ws == websocket:
                print(f"⚠️ Connection already exists for user {user_id} in room '{room}'")
                return
        
        self.active_connections[room].append((user_id, websocket))
        print(f"✅ User {user_id} connected to room '{room}' (total: {len(self.active_connections[room])})")
    
    def disconnect(self, websocket: WebSocket, room: str = "global"):
        """Remove a WebSocket connection from room."""
        if room in self.active_connections:
            self.active_connections[room] = [
                (uid, ws) for uid, ws in self.active_connections[room] if ws != websocket
            ]
            print(f"❌ Connection disconnected from room '{room}' (remaining: {len(self.active_connections[room])})")
            
            # Clean up empty rooms
            if not self.active_connections[room]:
                del self.active_connections[room]
    
    async def broadcast(self, message: dict, room: str = "global"):
        """Broadcast message to all connections in a room."""
        if room not in self.active_connections:
            return
        
        # Send to all connected clients in the room
        to_remove = []
        for i, (user_id, websocket) in enumerate(self.active_connections[room]):
            try:
                await websocket.send_json(message)
            except Exception as e:
                print(f"Error sending to user {user_id}: {e}")
                to_remove.append(websocket)
        
        # Clean up disconnected websockets
        for ws in to_remove:
            self.disconnect(ws, room)


# Global connection manager instance
manager = ConnectionManager()


@router.websocket("/ws/private/{friend_username}")
async def private_websocket_endpoint(
    websocket: WebSocket,
    friend_username: str,
    token: str = Query(...)
):
    """
    WebSocket endpoint for real-time private messaging.
    
    Args:
        websocket: WebSocket connection
        friend_username: Username of the friend to chat with
        token: JWT token for authentication
    """
    # Authenticate user
    from app.core.security import decode_access_token
    from app.models.friendship import Friendship
    
    payload = decode_access_token(token)
    if not payload:
        await websocket.close(code=1008, reason="Invalid token")
        return
    
    username = payload.get("sub")
    if not username:
        await websocket.close(code=1008, reason="Invalid token")
        return
    
    user = await User.find_one(User.username == username)
    if not user:
        await websocket.close(code=1008, reason="User not found")
        return
    
    # Find friend
    friend = await User.find_one(User.username == friend_username)
    if not friend:
        await websocket.close(code=1008, reason="Friend not found")
        return
    
    # Verify friendship
    friendship = await Friendship.find_one(
        {
            "$or": [
                {"user_id": str(user.id), "friend_id": str(friend.id), "status": "accepted"},
                {"user_id": str(friend.id), "friend_id": str(user.id), "status": "accepted"}
            ]
        }
    )
    
    if not friendship:
        await websocket.close(code=1008, reason="Not friends")
        return
    
    # Create unique room for this conversation (sorted IDs for consistency)
    room = f"private:{min(str(user.id), str(friend.id))}:{max(str(user.id), str(friend.id))}"
    user_id = str(user.id)
    
    # Connect to room
    await manager.connect(websocket, user_id, room)
    
    # Setup Redis Pub/Sub
    redis_client = RedisClient.get_client()
    pubsub = redis_client.pubsub()
    await pubsub.subscribe(f"chat:{room}")
    
    try:
        # Send welcome message
        await websocket.send_json({
            "type": "system",
            "content": f"Connected to private chat with {friend_username}",
            "timestamp": datetime.utcnow().isoformat()
        })
        
        async def receive_messages():
            """Receive messages from WebSocket and publish to Redis."""
            while True:
                try:
                    data = await websocket.receive_text()
                    message_data = json.loads(data)
                    
                    # Save private message to database
                    new_message = PrivateMessage(
                        sender_id=str(user.id),
                        sender_username=user.username,
                        receiver_id=str(friend.id),
                        receiver_username=friend_username,
                        message=message_data.get("content", "")
                    )
                    await new_message.insert()
                    
                    # Publish to Redis for broadcasting
                    message_payload = {
                        "type": "private_message",
                        "id": str(new_message.id),
                        "content": new_message.message,
                        "sender_username": user.username,
                        "sender_id": user_id,
                        "receiver_username": friend_username,
                        "receiver_id": str(friend.id),
                        "timestamp": new_message.created_at.isoformat(),
                        "read": False
                    }
                    
                    await redis_client.publish(
                        f"chat:{room}",
                        json.dumps(message_payload)
                    )
                    
                except WebSocketDisconnect:
                    break
                except Exception as e:
                    print(f"Error receiving private message: {e}")
                    break
        
        async def publish_messages():
            """Listen to Redis Pub/Sub and broadcast to WebSocket."""
            while True:
                try:
                    message = await pubsub.get_message(ignore_subscribe_messages=True)
                    if message and message["type"] == "message":
                        data = json.loads(message["data"])
                        await manager.broadcast(data, room)
                    await asyncio.sleep(0.01)
                except Exception as e:
                    print(f"Error publishing private message: {e}")
                    break
        
        # Run both tasks concurrently
        await asyncio.gather(
            receive_messages(),
            publish_messages()
        )
        
    except WebSocketDisconnect:
        manager.disconnect(websocket, room)
        print(f"User {username} disconnected from private chat with {friend_username}")
    except Exception as e:
        print(f"Private WebSocket error: {e}")
        manager.disconnect(websocket, room)
    finally:
        await pubsub.unsubscribe(f"chat:{room}")
        await pubsub.close()

