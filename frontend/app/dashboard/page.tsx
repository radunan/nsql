'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { authApi, postsApi, usersApi } from '@/lib/api';
import { removeToken, isAuthenticated } from '@/lib/auth';
import type { User, Post, Comment } from '@/types';
import { Beer, Users, MessageCircle, LogOut, Camera, Send, Heart, Loader2, MessageSquare, X, Edit, Trash2 } from 'lucide-react';
import Alert from '@/components/Alert';
import Confirm from '@/components/Confirm';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [postError, setPostError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Comments state
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [newComment, setNewComment] = useState<Record<string, string>>({});
  const [commentingPost, setCommentingPost] = useState<string | null>(null);
  
  // Profile edit state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editBio, setEditBio] = useState('');
  const [editSoberDate, setEditSoberDate] = useState('');
  const [editFavoriteDrinks, setEditFavoriteDrinks] = useState<string[]>([]);
  const [availableDrinks, setAvailableDrinks] = useState<string[]>([]);
  const [drinkTypes, setDrinkTypes] = useState<string[]>([]);
  const [czechBeers, setCzechBeers] = useState<string[]>([]);
  const [drinkTab, setDrinkTab] = useState<'types' | 'beers'>('types');
  const [saving, setSaving] = useState(false);

  // Alert/Confirm states
  const [alertMessage, setAlertMessage] = useState('');
  const [showAlert, setShowAlert] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/');
      return;
    }

    loadData();
  }, [router]);

  const loadData = async () => {
    try {
      const [userData, postsData] = await Promise.all([
        authApi.getMe(),
        postsApi.getPosts(),
      ]);
      console.log('Loaded user data:', userData);
      console.log('User favorite_drinks:', userData.favorite_drinks);
      setUser(userData);
      setPosts(postsData);
    } catch (error) {
      console.error('Error loading data:', error);
      removeToken();
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.trim()) return;

    setPosting(true);
    setPostError('');
    try {
      let imageUrl: string | undefined;
      
      // Upload image first if selected
      if (imageFile) {
        const uploadResult = await postsApi.uploadImage(imageFile);
        imageUrl = uploadResult.image_url;
      }
      
      const post = await postsApi.createPost(newPost, imageUrl);
      setPosts([post, ...posts]);
      setNewPost('');
      setImageFile(null);
      setImagePreview(null);
    } catch (error: any) {
      console.error('Error creating post:', error);
      const errorMsg = error.response?.data?.detail;
      if (typeof errorMsg === 'string') {
        setPostError(errorMsg);
      } else if (Array.isArray(errorMsg)) {
        setPostError(errorMsg.map((e: any) => e.msg).join(', '));
      } else {
        setPostError('Failed to create post');
      }
    } finally {
      setPosting(false);
    }
  };

  const handleLikePost = async (postId: string) => {
    try {
      const updatedPost = await postsApi.likePost(postId);
      setPosts(posts.map(p => p.id === postId ? updatedPost : p));
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const handleToggleComments = async (postId: string) => {
    if (expandedPostId === postId) {
      setExpandedPostId(null);
    } else {
      setExpandedPostId(postId);
      // Load comments if not already loaded
      if (!comments[postId]) {
        try {
          const postComments = await postsApi.getComments(postId);
          console.log('Loaded comments:', postComments);
          console.log('Current user:', user);
          setComments({ ...comments, [postId]: postComments });
        } catch (error) {
          console.error('Error loading comments:', error);
        }
      }
    }
  };

  const handleCreateComment = async (postId: string) => {
    const content = newComment[postId]?.trim();
    if (!content) return;

    setCommentingPost(postId);
    try {
      const comment = await postsApi.createComment(postId, content);
      console.log('Created comment:', comment);
      console.log('Current user:', user);
      setComments({
        ...comments,
        [postId]: [...(comments[postId] || []), comment]
      });
      setNewComment({ ...newComment, [postId]: '' });
      // Update comments count in post
      setPosts(posts.map(p => 
        p.id === postId 
          ? { ...p, comments_count: p.comments_count + 1 }
          : p
      ));
    } catch (error) {
      console.error('Error creating comment:', error);
    } finally {
      setCommentingPost(null);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleOpenEditModal = async () => {
    setEditBio(user?.bio || '');
    setEditSoberDate(user?.sober_date ? user.sober_date.split('T')[0] : '');
    setEditFavoriteDrinks(user?.favorite_drinks || []);
    
    console.log('Opening modal - user favorite drinks:', user?.favorite_drinks);
    
    // Load all drink lists
    try {
      const [typesRes, beersRes] = await Promise.all([
        fetch('http://localhost:8000/api/users/drinks/types'),
        fetch('http://localhost:8000/api/users/drinks/czech-beers')
      ]);
      
      const typesData = await typesRes.json();
      const beersData = await beersRes.json();
      
      setDrinkTypes(typesData.types);
      setCzechBeers(beersData.beers);
      
      console.log('Loaded drink types:', typesData.types.length);
      console.log('Loaded Czech beers:', beersData.beers.length);
    } catch (error) {
      console.error('Error loading drinks:', error);
    }
    
    setShowEditModal(true);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    console.log('Saving profile with favorite drinks:', editFavoriteDrinks);
    try {
      const updatedUser = await usersApi.updateProfile(
        editBio, 
        editSoberDate ? new Date(editSoberDate).toISOString() : undefined,
        editFavoriteDrinks
      );
      console.log('Profile saved, updated user:', updatedUser);
      console.log('Updated user favorite_drinks:', updatedUser.favorite_drinks);
      setUser(updatedUser);
      setShowEditModal(false);
      setAlertMessage('Profile updated successfully!');
      setShowAlert(true);
    } catch (error) {
      console.error('Error updating profile:', error);
      setAlertMessage('Failed to update profile');
      setShowAlert(true);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    removeToken();
    router.push('/');
  };

  const handleDeleteComment = async (postId: string, commentId: string) => {
    setConfirmMessage('Are you sure you want to delete this comment?');
    setConfirmAction(() => async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:8000/api/posts/${postId}/comments/${commentId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          // Remove comment from state
          setComments({
            ...comments,
            [postId]: comments[postId].filter(c => c.id !== commentId)
          });
          
          // Update comments count on post
          setPosts(posts.map(p => 
            p.id === postId 
              ? { ...p, comments_count: Math.max(0, p.comments_count - 1) }
              : p
          ));
          setAlertMessage('Comment deleted successfully');
          setShowAlert(true);
        } else {
          setAlertMessage('Failed to delete comment');
          setShowAlert(true);
        }
      } catch (error) {
        console.error('Error deleting comment:', error);
        setAlertMessage('Failed to delete comment');
        setShowAlert(true);
      }
    });
    setShowConfirm(true);
  };

  const handleDeletePost = async (postId: string) => {
    setConfirmMessage('Are you sure you want to delete this post?');
    setConfirmAction(() => async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:8000/api/posts/${postId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          // Remove post from state
          setPosts(posts.filter(p => p.id !== postId));
          // Remove comments for this post
          const newComments = { ...comments };
          delete newComments[postId];
          setComments(newComments);
          setAlertMessage('Post deleted successfully');
          setShowAlert(true);
        } else {
          setAlertMessage('Failed to delete post');
          setShowAlert(true);
        }
      } catch (error) {
        console.error('Error deleting post:', error);
        setAlertMessage('Failed to delete post');
        setShowAlert(true);
      }
    });
    setShowConfirm(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Beer className="w-16 h-16 text-amber-400 mx-auto mb-4 animate-float" />
          <div className="text-xl text-amber-300 mb-6">Loading your buddies...</div>
          
          {/* Skeleton Loading */}
          <div className="max-w-2xl mx-auto space-y-4 px-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-stone-900/50 rounded-2xl p-6 border border-amber-900/20 animate-fade-in" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full skeleton"></div>
                  <div className="flex-1 space-y-3">
                    <div className="h-4 skeleton rounded w-1/4"></div>
                    <div className="h-3 skeleton rounded w-3/4"></div>
                    <div className="h-3 skeleton rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-stone-900/90 backdrop-blur-xl shadow-lg border-b border-amber-900/30 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-400 via-orange-500 to-amber-600 bg-clip-text text-transparent flex items-center gap-2">
            <Beer className="w-7 h-7 text-amber-500" />
            DrinkBuddies
          </h1>
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/friends')}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-all shadow-lg shadow-amber-900/30 flex items-center gap-2"
            >
              <Users className="w-4 h-4" />
              Friends
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-900/50 border border-red-700/50 text-red-200 rounded-lg hover:bg-red-800/50 transition-all flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <div className="bg-gradient-to-br from-stone-900/90 to-stone-800/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-amber-900/30 p-6 sticky top-24">
              <div className="text-center mb-4 relative">
                <button
                  onClick={handleOpenEditModal}
                  className="absolute top-0 right-0 p-2 text-amber-400 hover:text-amber-300 transition-colors"
                  title="Edit profile"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <div className="w-20 h-20 bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 rounded-full mx-auto flex items-center justify-center text-3xl text-white font-bold shadow-lg shadow-amber-900/50">
                  {user?.username.charAt(0).toUpperCase()}
                </div>
                <h2 className="text-xl font-bold text-amber-100 mt-3">
                  {user?.username}
                </h2>
                <p className="text-sm text-amber-300/70">{user?.email}</p>
              </div>

              <div className="border-t border-amber-900/30 pt-4">
                <div className="bg-gradient-to-r from-amber-900/30 to-orange-900/30 rounded-xl p-4 text-center border border-amber-700/30">
                  <div className="text-4xl font-bold text-amber-400">
                    {user?.days_sober}
                  </div>
                  <div className="text-sm text-amber-200/70 mt-1 flex items-center gap-1 justify-center">
                    <Beer className="w-4 h-4" />
                    Days Drinking
                  </div>
                </div>

                {user?.bio && (
                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-amber-100 mb-2">
                      Bio
                    </h3>
                    <p className="text-sm text-amber-200/80">{user.bio}</p>
                  </div>
                )}

                {user?.favorite_drinks && user.favorite_drinks.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-amber-100 mb-2 flex items-center gap-1">
                      <Beer className="w-4 h-4" />
                      Favorite Drinks
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {user.favorite_drinks.map((drink) => (
                        <span 
                          key={drink} 
                          className="px-2 py-1 bg-amber-900/30 border border-amber-700/30 rounded-lg text-xs text-amber-100"
                        >
                          {drink}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {user?.sober_date && (
                  <div className="mt-4 text-sm text-amber-200/70">
                    <strong className="text-amber-100">Drinking since:</strong>{' '}
                    {new Date(user.sober_date).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Feed */}
          <div className="lg:col-span-2 space-y-6">
            {/* Create Post */}
            <div className="bg-gradient-to-br from-stone-900/90 to-stone-800/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-amber-900/30 p-6 mb-6">
              <h2 className="text-xl font-semibold text-amber-100 mb-4 flex items-center gap-2">
                <Send className="w-5 h-5" />
                Share with your buddies
              </h2>
              <form onSubmit={handleCreatePost}>
                <textarea
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  className="w-full px-4 py-3 bg-stone-800/50 border border-amber-900/50 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none text-amber-50 placeholder-amber-300/30"
                  rows={3}
                  placeholder="What's on your mind? 🍺"
                  required
                />
                
                {imagePreview && (
                  <div className="mt-3 relative inline-block">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="max-h-48 rounded-lg border border-gray-300"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-700"
                    >
                      ×
                    </button>
                  </div>
                )}
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                
                {postError && (
                  <div className="mt-3 bg-red-900/30 border border-red-700/50 text-red-200 px-4 py-2 rounded-xl text-sm">
                    {postError}
                  </div>
                )}
                
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-stone-700/50 border border-amber-900/30 text-amber-100 rounded-lg hover:bg-stone-600/50 transition-all flex items-center gap-2"
                  >
                    <Camera className="w-4 h-4" />
                    Add Photo
                  </button>
                  <button
                    type="submit"
                    disabled={posting || !newPost.trim()}
                    className="px-6 py-2 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white rounded-lg font-semibold hover:from-amber-600 hover:via-orange-600 hover:to-amber-700 transition-all disabled:opacity-50 shadow-lg shadow-amber-900/50 flex items-center gap-2"
                  >
                    {posting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Posting...
                      </>
                    ) : (
                      <>
                        <Beer className="w-4 h-4" />
                        Post
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Posts Feed */}
            <div className="space-y-4">
              {posts.length === 0 ? (
                <div className="bg-gradient-to-br from-stone-900/90 to-stone-800/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-amber-900/30 p-8 text-center">
                  <Beer className="w-16 h-16 text-amber-500/50 mx-auto mb-4" />
                  <p className="text-amber-200/70">No posts yet. Be the first to share!</p>
                </div>
              ) : (
                posts.map((post, index) => (
                  <div
                    key={post.id}
                    className="bg-gradient-to-br from-stone-900/90 to-stone-800/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-amber-900/30 p-6 hover:border-amber-700/50 transition-smooth animate-fade-in"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => router.push(`/profile/${post.author_username}`)}
                        className="w-12 h-12 bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg shadow-amber-900/50 hover:scale-110 transition-transform cursor-pointer"
                      >
                        {post.author_username.charAt(0).toUpperCase()}
                      </button>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => router.push(`/profile/${post.author_username}`)}
                            className="font-semibold text-amber-100 hover:text-amber-300 transition-colors cursor-pointer"
                          >
                            {post.author_username}
                          </button>
                          <span className="text-sm text-amber-300/50">
                            {new Date(post.created_at).toLocaleString()}
                          </span>
                          {user && post.author_username === user.username && (
                            <button
                              onClick={() => handleDeletePost(post.id)}
                              className="ml-auto text-red-400 hover:text-red-300 transition-colors p-1.5 hover:bg-red-900/20 rounded"
                              title="Delete post"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <p className="mt-2 text-amber-200/90">{post.content}</p>
                        {post.image_url && (
                          <img
                            src={`http://localhost:8000${post.image_url}`}
                            alt="Post image"
                            className="mt-3 rounded-xl max-w-full max-h-96 object-cover border border-amber-900/30"
                          />
                        )}
                        
                        {/* Like and Comment Buttons */}
                        <div className="mt-3 flex items-center gap-4 text-sm border-t border-amber-900/30 pt-3">
                          <button 
                            onClick={() => handleLikePost(post.id)}
                            className={`like-button transition-smooth flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${
                              post.liked_by_user 
                                ? 'text-amber-400 bg-amber-900/30 liked' 
                                : 'text-amber-300/70 hover:text-amber-400 hover:bg-amber-900/20'
                            }`}
                          >
                            <Heart className={`w-4 h-4 ${post.liked_by_user ? 'fill-amber-400' : ''}`} />
                            {post.likes_count} cheers
                          </button>
                          <button 
                            onClick={() => handleToggleComments(post.id)}
                            className="text-amber-300/70 hover:text-amber-400 transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-amber-900/20"
                          >
                            <MessageSquare className="w-4 h-4" />
                            {post.comments_count} comments
                          </button>
                        </div>

                        {/* Comments Section */}
                        {expandedPostId === post.id && (
                          <div className="mt-4 space-y-3 border-t border-amber-900/30 pt-4">
                            {/* Comments List */}
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                              {comments[post.id]?.map((comment, idx) => (
                                <div key={comment.id} className="bg-stone-800/50 rounded-lg p-3 border border-amber-900/20 animate-fade-in" style={{ animationDelay: `${idx * 0.05}s` }}>
                                  <div className="flex items-start gap-2">
                                    <button
                                      onClick={() => router.push(`/profile/${comment.author_username}`)}
                                      className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold hover:scale-110 transition-transform cursor-pointer"
                                    >
                                      {comment.author_username.charAt(0).toUpperCase()}
                                    </button>
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={() => router.push(`/profile/${comment.author_username}`)}
                                          className="text-sm font-semibold text-amber-100 hover:text-amber-300 transition-colors cursor-pointer"
                                        >
                                          {comment.author_username}
                                        </button>
                                        <span className="text-xs text-amber-300/50">
                                          {new Date(comment.created_at).toLocaleString()}
                                        </span>
                                      </div>
                                      <p className="text-sm text-amber-200/80 mt-1">{comment.content}</p>
                                    </div>
                                    {user && comment.author_username === user.username ? (
                                      <button
                                        onClick={() => handleDeleteComment(post.id, comment.id)}
                                        className="text-red-400 hover:text-red-300 transition-colors p-1 hover:bg-red-900/20 rounded"
                                        title="Delete comment"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    ) : (
                                      <div className="w-6 h-6" title={`Debug: user=${user?.username}, author=${comment.author_username}`}></div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* New Comment Form */}
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={newComment[post.id] || ''}
                                onChange={(e) => setNewComment({ ...newComment, [post.id]: e.target.value })}
                                placeholder="Write a comment..."
                                className="flex-1 px-3 py-2 bg-stone-800/50 border border-amber-900/50 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-amber-50 placeholder-amber-300/30 text-sm"
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleCreateComment(post.id);
                                  }
                                }}
                              />
                              <button
                                onClick={() => handleCreateComment(post.id)}
                                disabled={!newComment[post.id]?.trim() || commentingPost === post.id}
                                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-50 flex items-center gap-1.5 text-sm font-semibold shadow-lg shadow-amber-900/30"
                              >
                                {commentingPost === post.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Send className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-stone-900 to-stone-800 rounded-2xl shadow-2xl border border-amber-900/50 p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-amber-100 flex items-center gap-2">
                <Edit className="w-5 h-5" />
                Edit Profile
              </h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-amber-300/70 hover:text-amber-400 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-amber-100 mb-2">
                  Bio
                </label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  className="w-full px-4 py-3 bg-stone-800/50 border border-amber-900/50 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none text-amber-50 placeholder-amber-300/30"
                  rows={3}
                  placeholder="Tell us about yourself..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-amber-100 mb-2">
                  Drinking Since Date
                </label>
                <input
                  type="date"
                  value={editSoberDate}
                  onChange={(e) => setEditSoberDate(e.target.value)}
                  className="w-full px-4 py-3 bg-stone-800/50 border border-amber-900/50 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent text-amber-50"
                />
                <p className="text-xs text-amber-300/50 mt-1">
                  Set the date when you started drinking regularly
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-amber-100 mb-2">
                  Favorite Drinks 🍺
                </label>
                
                {/* Tabs */}
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => setDrinkTab('types')}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                      drinkTab === 'types'
                        ? 'bg-amber-600 text-white shadow-lg'
                        : 'bg-stone-800/50 text-amber-300 hover:bg-stone-700/50'
                    }`}
                  >
                    Alcohol Types
                  </button>
                  <button
                    onClick={() => setDrinkTab('beers')}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                      drinkTab === 'beers'
                        ? 'bg-amber-600 text-white shadow-lg'
                        : 'bg-stone-800/50 text-amber-300 hover:bg-stone-700/50'
                    }`}
                  >
                    Czech Beer 🇨🇿
                  </button>
                </div>

                {/* Drink list */}
                <div className="max-h-48 overflow-y-auto bg-stone-800/30 border border-amber-900/30 rounded-xl p-3 space-y-2">
                  {(drinkTab === 'types' ? drinkTypes : czechBeers).map((drink) => (
                    <label key={drink} className="flex items-center gap-2 cursor-pointer hover:bg-amber-900/20 p-2 rounded-lg transition-smooth">
                      <input
                        type="checkbox"
                        checked={editFavoriteDrinks.includes(drink)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditFavoriteDrinks([...editFavoriteDrinks, drink]);
                          } else {
                            setEditFavoriteDrinks(editFavoriteDrinks.filter(d => d !== drink));
                          }
                        }}
                        className="w-4 h-4 text-amber-500 bg-stone-700 border-amber-900/50 rounded focus:ring-amber-500"
                      />
                      <span className="text-amber-100 text-sm">{drink}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-amber-300/50 mt-2">
                  Select your favorite alcoholic beverages
                </p>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 bg-stone-700/50 border border-amber-900/30 text-amber-100 rounded-lg hover:bg-stone-600/50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-amber-900/30"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alert Modal */}
      {showAlert && (
        <Alert
          message={alertMessage}
          onClose={() => setShowAlert(false)}
        />
      )}

      {/* Confirm Modal */}
      {showConfirm && (
        <Confirm
          message={confirmMessage}
          onConfirm={() => {
            setShowConfirm(false);
            if (confirmAction) confirmAction();
          }}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </div>
  );
}
