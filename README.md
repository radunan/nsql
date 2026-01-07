# DrinkBuddies Backend

A robust backend API for a social network designed for people who enjoy drinking to connect, share experiences, and find drinking buddies.

## 🎯 Features

- **User Authentication**: Secure JWT-based authentication with bcrypt password hashing
- **User Profiles**: Username, bio, and "Drinking Since" date tracking (calculates days drinking)
- **Social Feed**: Create, read, update, and delete text posts with photo support
- **Real-time Chat**: WebSocket-based public and private chat using Redis Pub/Sub
- **Friends System**: Send friend requests, accept/reject, and manage friendships
- **RESTful API**: Clean, documented endpoints following REST principles

## 🛠️ Technology Stack

- **Language**: Python 3.10+
- **Framework**: FastAPI (Async)
- **Database**: MongoDB with Motor (async driver) and Beanie ODM
- **Cache/Messaging**: Redis for caching and Pub/Sub messaging
- **Authentication**: JWT tokens with passlib (bcrypt)
- **Containerization**: Docker & Docker Compose

## 📁 Project Structure

```
drinkbuddies/
├── app/
│   ├── core/
│   │   ├── config.py           # Application configuration
│   │   ├── security.py         # JWT & password utilities
│   │   ├── dependencies.py     # FastAPI dependencies
│   │   ├── schemas.py          # User schemas
│   │   └── post_schemas.py     # Post & Message schemas
│   ├── db/
│   │   ├── mongodb.py          # MongoDB connection
│   │   └── redis.py            # Redis connection
│   ├── models/
│   │   ├── user.py             # User model
│   │   ├── post.py             # Post model
│   │   └── message.py          # Message model
│   ├── routers/
│   │   ├── auth.py             # Authentication endpoints
│   │   ├── users.py            # User profile endpoints
│   │   ├── posts.py            # Post CRUD endpoints
│   │   └── chat.py             # WebSocket chat endpoints
│   └── main.py                 # Application entry point
├── docker-compose.yml
├── Dockerfile
├── requirements.txt
└── .env.example
```

## 🚀 Getting Started

### Prerequisites

- Docker and Docker Compose
- Python 3.10+ (for local development)

### Installation & Running

1. **Clone the repository**:
   ```bash
   cd drinkbuddies
   ```

2. **Create environment file**:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and update the `SECRET_KEY` with a secure random string:
   ```bash
   openssl rand -hex 32
   ```

3. **Start services with Docker Compose**:
   ```bash
   docker-compose up -d
   ```

4. **Access the API**:
   - API: http://localhost:8000
   - Interactive API docs: http://localhost:8000/docs
   - Alternative docs: http://localhost:8000/redoc

### Local Development (without Docker)

1. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Start MongoDB and Redis** (separate terminals or use Docker):
   ```bash
   # MongoDB
   docker run -d -p 27017:27017 mongo:latest
   
   # Redis
   docker run -d -p 6379:6379 redis:alpine
   ```

3. **Run the application**:
   ```bash
   python -m uvicorn app.main:app --reload
   ```

## 📚 API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login (OAuth2 form)
- `POST /api/auth/login/json` - Login (JSON body)

### Users

- `GET /api/users/me` - Get current user profile
- `GET /api/users/{username}` - Get user by username
- `PUT /api/users/me` - Update current user profile

### Posts

- `POST /api/posts/` - Create a new post
- `GET /api/posts/` - Get all posts (paginated)
- `GET /api/posts/{post_id}` - Get specific post
- `PUT /api/posts/{post_id}` - Update post (author only)
- `DELETE /api/posts/{post_id}` - Delete post (author only)

### Chat

- `WS /api/chat/ws?token={jwt}&room={room}` - WebSocket chat connection
- `GET /api/chat/messages?room={room}` - Get recent messages from room

### Health

- `GET /` - API welcome message
- `GET /health` - Health check

## 🔐 Authentication Flow

1. **Register**: `POST /api/auth/register`
   ```json
   {
     "username": "john_doe",
     "email": "john@example.com",
     "password": "securepassword123",
     "bio": "Day by day, staying strong!",
     "sober_date": "2024-01-01T00:00:00"
   }
   ```

2. **Login**: `POST /api/auth/login/json`
   ```json
   {
     "username": "john_doe",
     "password": "securepassword123"
   }
   ```
   
   Response:
   ```json
   {
     "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
     "token_type": "bearer"
   }
   ```

3. **Use token**: Include in Authorization header:
   ```
   Authorization: Bearer {access_token}
   ```

## 💬 WebSocket Chat Usage

1. Connect to WebSocket endpoint with JWT token:
   ```javascript
   const ws = new WebSocket('ws://localhost:8000/api/chat/ws?token=YOUR_JWT_TOKEN&room=global');
   
   ws.onmessage = (event) => {
     const message = JSON.parse(event.data);
     console.log(message);
   };
   
   // Send message
   ws.send(JSON.stringify({
     content: "Hello everyone!"
   }));
   ```

2. Messages are broadcast to all connected users in the same room via Redis Pub/Sub.

## 🧪 Testing the API

### Using curl

```bash
# Register user
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123",
    "sober_date": "2024-01-01T00:00:00"
  }'

# Login
curl -X POST http://localhost:8000/api/auth/login/json \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123"
  }'

# Create post (replace TOKEN with your JWT)
curl -X POST http://localhost:8000/api/posts/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "content": "100 days sober today! Feeling grateful."
  }'
```

### Using Python

See `test_client.py` for a complete example of interacting with the API.

## 🔧 Configuration

Environment variables (`.env`):

```env
MONGODB_URL=mongodb://localhost:27017
REDIS_URL=redis://localhost:6379
SECRET_KEY=your-secret-key-change-this-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
DATABASE_NAME=drinkbuddies
```

## 🐳 Docker Commands

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Rebuild and restart
docker-compose up -d --build

# Access MongoDB shell
docker exec -it drinkbuddies_mongodb mongosh

# Access Redis CLI
docker exec -it drinkbuddies_redis redis-cli
```

## 📊 Database Schema

### User Collection
- `username` (unique, indexed)
- `email` (unique, indexed)
- `hashed_password`
- `bio`
- `sober_date`
- `created_at`
- `updated_at`
- `is_active`

### Post Collection
- `content`
- `author` (reference to User)
- `created_at` (indexed, descending)
- `updated_at`
- `likes_count`

### Message Collection
- `content`
- `sender` (reference to User)
- `room` (indexed)
- `created_at` (indexed, descending)

## 🛡️ Security Features

- **Password Hashing**: Bcrypt with automatic salt generation
- **JWT Tokens**: Secure token-based authentication with expiration
- **Input Validation**: Pydantic models for request validation
- **CORS**: Configurable Cross-Origin Resource Sharing
- **Async Operations**: Non-blocking I/O for better performance

## 📝 License

This project is open source and available for educational purposes.

## 🤝 Contributing

This is a demonstration project. Feel free to fork and adapt for your own needs.

## 📧 Support

For issues or questions, please refer to the API documentation at `/docs`.

---

**Remember**: This is a support network for recovery. Stay strong, one day at a time! 💪
