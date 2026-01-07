#!/usr/bin/env python3
"""
Simple test client for DrinkBuddies API
Demonstrates basic API interactions
"""

import requests
import json
from datetime import datetime


BASE_URL = "http://localhost:8000"


class DrinkBuddiesClient:
    """Client for interacting with DrinkBuddies API."""
    
    def __init__(self, base_url: str = BASE_URL):
        self.base_url = base_url
        self.token = None
        self.headers = {"Content-Type": "application/json"}
    
    def register(self, username: str, email: str, password: str, sober_date: str = None):
        """Register a new user."""
        data = {
            "username": username,
            "email": email,
            "password": password,
        }
        if sober_date:
            data["sober_date"] = sober_date
        
        response = requests.post(
            f"{self.base_url}/api/auth/register",
            headers=self.headers,
            json=data
        )
        return response.json()
    
    def login(self, username: str, password: str):
        """Login and store the JWT token."""
        data = {
            "username": username,
            "password": password
        }
        
        response = requests.post(
            f"{self.base_url}/api/auth/login/json",
            headers=self.headers,
            json=data
        )
        
        result = response.json()
        if "access_token" in result:
            self.token = result["access_token"]
            self.headers["Authorization"] = f"Bearer {self.token}"
            print("✅ Login successful!")
        
        return result
    
    def get_profile(self):
        """Get current user's profile."""
        response = requests.get(
            f"{self.base_url}/api/users/me",
            headers=self.headers
        )
        return response.json()
    
    def update_profile(self, bio: str = None, sober_date: str = None):
        """Update user profile."""
        data = {}
        if bio:
            data["bio"] = bio
        if sober_date:
            data["sober_date"] = sober_date
        
        response = requests.put(
            f"{self.base_url}/api/users/me",
            headers=self.headers,
            json=data
        )
        return response.json()
    
    def create_post(self, content: str):
        """Create a new post."""
        data = {"content": content}
        
        response = requests.post(
            f"{self.base_url}/api/posts/",
            headers=self.headers,
            json=data
        )
        return response.json()
    
    def get_posts(self, skip: int = 0, limit: int = 20):
        """Get posts from the feed."""
        response = requests.get(
            f"{self.base_url}/api/posts/?skip={skip}&limit={limit}",
            headers=self.headers
        )
        return response.json()
    
    def get_messages(self, room: str = "global", limit: int = 50):
        """Get recent chat messages."""
        response = requests.get(
            f"{self.base_url}/api/chat/messages?room={room}&limit={limit}",
            headers=self.headers
        )
        return response.json()


def main():
    """Example usage of the client."""
    
    print("🍻 DrinkBuddies API Test Client\n")
    
    client = DrinkBuddiesClient()
    
    # Test 1: Register a new user
    print("📝 Test 1: Registering user...")
    try:
        user = client.register(
            username="testuser_demo",
            email="demo@drinkbuddies.com",
            password="securepass123",
            sober_date="2024-01-01T00:00:00"
        )
        print(f"✅ Registered: {user['username']}")
        print(f"   Days sober: {user['days_sober']}")
    except Exception as e:
        print(f"⚠️  User might already exist: {e}")
    
    print()
    
    # Test 2: Login
    print("🔐 Test 2: Logging in...")
    try:
        token_data = client.login("testuser_demo", "securepass123")
        print(f"✅ Token received: {token_data['access_token'][:30]}...")
    except Exception as e:
        print(f"❌ Login failed: {e}")
        return
    
    print()
    
    # Test 3: Get profile
    print("👤 Test 3: Getting profile...")
    try:
        profile = client.get_profile()
        print(f"✅ Profile: {profile['username']}")
        print(f"   Email: {profile['email']}")
        print(f"   Days sober: {profile['days_sober']}")
    except Exception as e:
        print(f"❌ Failed: {e}")
    
    print()
    
    # Test 4: Update profile
    print("✏️  Test 4: Updating bio...")
    try:
        updated = client.update_profile(bio="Testing the API - staying strong! 💪")
        print(f"✅ Bio updated: {updated['bio']}")
    except Exception as e:
        print(f"❌ Failed: {e}")
    
    print()
    
    # Test 5: Create a post
    print("📮 Test 5: Creating a post...")
    try:
        post = client.create_post(
            "This is a test post from the API client. One day at a time!"
        )
        print(f"✅ Post created: {post['id']}")
        print(f"   Content: {post['content']}")
    except Exception as e:
        print(f"❌ Failed: {e}")
    
    print()
    
    # Test 6: Get posts
    print("📰 Test 6: Getting posts from feed...")
    try:
        posts = client.get_posts(limit=5)
        print(f"✅ Retrieved {len(posts)} posts:")
        for post in posts:
            print(f"   - @{post['author_username']}: {post['content'][:50]}...")
    except Exception as e:
        print(f"❌ Failed: {e}")
    
    print()
    
    # Test 7: Get chat messages
    print("💬 Test 7: Getting chat messages...")
    try:
        messages = client.get_messages()
        print(f"✅ Retrieved {len(messages)} messages")
        if messages:
            for msg in messages[:3]:
                print(f"   - @{msg['sender_username']}: {msg['content'][:40]}...")
    except Exception as e:
        print(f"❌ Failed: {e}")
    
    print("\n✨ All tests completed!")


if __name__ == "__main__":
    main()
