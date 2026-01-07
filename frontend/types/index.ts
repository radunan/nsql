    // TypeScript types matching FastAPI backend

export interface User {
  id: string;
  username: string;
  email: string;
  bio?: string;
  favorite_drinks: string[];
  sober_date?: string;
  days_sober: number;
  created_at: string;
  is_active: boolean;
}

export interface Post {
  id: string;
  author_id: string;
  author_username: string;
  content: string;
  created_at: string;
  likes_count: number;
  comments_count: number;
  image_url?: string;
  liked_by_user: boolean;
}

export interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  author_username: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface Friend {
  id: string;
  username: string;
  email: string;
  days_sober: number;
  bio?: string;
  favorite_drinks?: string[];
}

export interface FriendRequest {
  id: string;
  user_id: string;
  user_username: string;
  friend_id: string;
  friend_username: string;
  status: string;
  created_at: string;
}

export interface PrivateMessage {
  id: string;
  sender_id: string;
  sender_username: string;
  receiver_id: string;
  receiver_username: string;
  message: string;
  created_at: string;
  read: boolean;
}

export interface ChatMessage {
  type: string;
  id?: string;
  content: string;
  sender_username: string;
  sender_id?: string;
  room?: string;
  timestamp: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  sober_date?: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface ApiError {
  detail: string;
}
