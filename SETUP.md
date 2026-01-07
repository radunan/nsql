# SoberSocial - Complete Setup Guide

Social network for people in recovery with BAC calculator, private messaging, and real-time features.

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ and npm (for frontend)
- Internet connection (first run downloads images)

### Complete Project Startup

1. **Start Backend Services** (MongoDB, Redis, Backend API, Management Tools):
```bash
cd sobersocial
docker compose up -d
```

This starts:
- **MongoDB** on port 27017
- **Redis** on port 6379
- **Backend API** on port 8000
- **Mongo Express** on port 8081 (MongoDB GUI)

2. **Start Redis Commander** (Redis GUI - optional):

**Poznámka**: Redis Commander nelze spustit v Dockeru kvůli problémům se sítí. Pokud chceš Redis GUI:

```bash
# Install globally (one-time)
sudo npm install -g redis-commander

# Run in background
redis-commander --port 8082 --redis-host localhost --redis-port 6379 &
```

3. **Start Frontend** (Next.js on port 3000):
```bash
cd frontend
npm install  # First time only
npm run dev
```

4. **Access the Application**:
- **Main App**: http://localhost:3000
- **API Docs**: http://localhost:8000/docs
- **MongoDB GUI**: http://localhost:8081
- **Redis GUI**: http://localhost:8082 (if installed)

## 📦 What Gets Installed

### Backend (Docker)
- **MongoDB**: NoSQL database for users, posts, messages
- **Redis**: Caching and rate limiting
- **FastAPI**: Python backend API
- **Mongo Express**: Web-based MongoDB admin interface

**Optional (manual install)**:
- **Redis Commander**: Web-based Redis admin interface (npm install)

### Frontend (Local)
- **Next.js 14**: React framework
- **TypeScript**: Type safety
- **Tailwind CSS**: Styling
- **Axios**: HTTP client

## 🔧 Configuration

### Environment Variables

Backend uses these environment variables (set in `docker-compose.yml`):
```yaml
MONGODB_URL=mongodb://mongodb:27017
REDIS_URL=redis://redis:6379
SECRET_KEY=your-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

**⚠️ IMPORTANT**: Change `SECRET_KEY` for production:
```bash
# Generate secure key
openssl rand -hex 32
```

### Frontend Configuration

Frontend connects to backend at `http://localhost:8000` (hardcoded in `lib/api.ts`)

## 📊 Services Overview

### Port Mapping
| Service | Port | Purpose |
|---------|------|---------|
| Frontend | 3000 | Next.js web application |
| Backend API | 8000 | FastAPI REST + WebSocket |
| Mongo Express | 8081 | MongoDB management |
| Redis Commander* | 8082 | Redis management (optional) |
| MongoDB | 27017 | Database (internal) |
| Redis | 6379 | Cache (internal) |

*Requires manual npm installation

### Docker Containers
- `drinkbuddies_mongodb` - MongoDB database
- `drinkbuddies_redis` - Redis cache
- `drinkbuddies_app` - FastAPI backend
- `drinkbuddies_mongo_express` - MongoDB GUI

## 🛠️ Useful Commands

### Docker Commands
```bash
# View all running containers
docker ps

# View logs
docker logs drinkbuddies_app                # Backend
docker logs drinkbuddies_mongodb            # MongoDB
docker logs drinkbuddies_redis              # Redis

# Follow logs in real-time
docker logs -f drinkbuddies_app

# Restart a service
docker compose restart app

# Stop all services
docker compose down

# Stop and remove all data
docker compose down -v

# Rebuild after code changes
docker compose up -d --build
```

### Frontend Commands
```bash
cd frontend

# Development server with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint

# Format code
npm run format
```

### Redis Commander (Optional)
```bash
# Start
redis-commander --port 8082 --redis-host localhost --redis-port 6379 &

# Stop
pkill -f redis-commander

# Check if running
curl http://localhost:8082
```

### Database Access

**MongoDB Shell**:
```bash
docker exec -it drinkbuddies_mongodb mongosh

# Inside mongosh
use drinkbuddies
db.users.find()
db.posts.find()
db.private_messages.find()
```

**Redis CLI**:
```bash
docker exec -it drinkbuddies_redis redis-cli

# Inside redis-cli
KEYS *
GET posts:feed:*
KEYS friends:*
```

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Find what's using the port
lsof -ti:3000  # or 8000, 8081, 8082

# Kill the process
kill -9 $(lsof -ti:3000)
```

### Docker Issues
```bash
# Full cleanup and restart
docker compose down -v
docker system prune -a
docker compose up -d --build
```

### Frontend Won't Start
```bash
cd frontend
rm -rf node_modules .next
npm install
npm run dev
```

### Redis Commander Won't Start in Docker
Redis Commander nelze spustit v Docker kontejneru kvůli problémům s připojením k Docker registrům. Použij manuální instalaci:

```bash
sudo npm install -g redis-commander
redis-commander --port 8082 --redis-host localhost --redis-port 6379 &
```

### Backend Errors
```bash
# Check logs
docker logs drinkbuddies_app

# Restart backend
docker compose restart app

# Rebuild if requirements changed
docker compose up -d --build app
```

## 📝 Project Structure

```
sobersocial/
├── app/                          # Backend Python code
│   ├── core/                     # Config, security, schemas
│   ├── db/                       # MongoDB & Redis clients
│   ├── models/                   # Database models
│   ├── routers/                  # API endpoints
│   ├── data/                     # Static data (drinks)
│   └── main.py                   # FastAPI app
├── frontend/                     # Next.js frontend
│   ├── app/                      # Pages & routes
│   ├── components/               # React components
│   ├── lib/                      # API & auth utilities
│   └── types/                    # TypeScript types
├── docker-compose.yml            # Docker services
├── Dockerfile                    # Backend container
├── requirements.txt              # Python dependencies
└── SETUP.md                      # This file
```

## ✅ Verify Installation

After starting everything:

1. **Check Docker containers**:
```bash
docker ps
# Should show 4 running containers (mongodb, redis, app, mongo-express)
```

2. **Test Backend**:
```bash
curl http://localhost:8000
# Should return: {"message": "Welcome to DrinkBuddies API"}
```

3. **Test Frontend**:
```bash
curl -I http://localhost:3000
# Should return: HTTP/1.1 200 OK
```

3. **Test Management UIs**:
- Mongo Express: http://localhost:8081 (should show databases)
- Redis Commander: http://localhost:8082 (if installed - should show Redis keys)

## 🎯 First Time Setup Checklist

- [ ] Docker & Docker Compose installed
- [ ] Node.js 18+ installed
- [ ] Run `docker compose up -d`
- [ ] (Optional) Install Redis Commander: `sudo npm install -g redis-commander`
- [ ] (Optional) Start Redis Commander: `redis-commander --port 8082 --redis-host localhost --redis-port 6379 &`
- [ ] Run `cd frontend && npm install`
- [ ] Run `npm run dev` in frontend directory
- [ ] Open http://localhost:3000
- [ ] Register a new user
- [ ] Test all features!

## 🔐 Security Notes

- Default `SECRET_KEY` is for development only
- Change it for production deployment
- MongoDB and Redis have no authentication by default
- Add authentication for production use
- Frontend runs on HTTP - use HTTPS in production

## 📚 Additional Resources

- **Backend API Docs**: http://localhost:8000/docs (Swagger UI)
- **Alternative API Docs**: http://localhost:8000/redoc (ReDoc)
- **MongoDB Docs**: https://www.mongodb.com/docs/
- **Redis Docs**: https://redis.io/docs/
- **FastAPI Docs**: https://fastapi.tiangolo.com/
- **Next.js Docs**: https://nextjs.org/docs

---

**Need help?** Check logs with `docker logs drinkbuddies_app` or open browser DevTools (F12) for frontend errors.
