'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import { friendsApi } from '@/lib/api';
import type { User, Friend } from '@/types';
import { Beer, ArrowLeft, UserPlus, MessageCircle, Check, Clock } from 'lucide-react';
import Alert from '@/components/Alert';

export default function ProfilePage() {
  const router = useRouter();
  const params = useParams();
  const username = params.username as string;
  const [user, setUser] = useState<User | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [friendshipStatus, setFriendshipStatus] = useState<'none' | 'pending' | 'friends'>('none');
  const [sendingRequest, setSendingRequest] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/');
      return;
    }

    const loadData = async () => {
      await loadProfile();
      await loadCurrentUser();
      await checkFriendshipStatus();
    };
    
    loadData();
  }, [username, router]);

  const loadCurrentUser = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/api/users/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data);
      }
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  };

  const loadProfile = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/users/${username}`);
      if (!response.ok) {
        throw new Error('User not found');
      }
      const data = await response.json();
      setUser(data);
    } catch (error) {
      console.error('Error loading profile:', error);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const checkFriendshipStatus = async () => {
    try {
      const friends = await friendsApi.getFriends();
      const isFriend = friends.some(f => f.username === username);
      if (isFriend) {
        setFriendshipStatus('friends');
      } else {
        // Check pending requests
        const requests = await friendsApi.getRequests();
        const hasPendingRequest = requests.some(r => r.user_username === username);
        if (hasPendingRequest) {
          setFriendshipStatus('pending');
        }
      }
    } catch (error) {
      console.error('Error checking friendship status:', error);
      // Don't block the page if friendship check fails
    }
  };

  const handleSendFriendRequest = async () => {
    if (!user) return;
    
    setSendingRequest(true);
    try {
      await friendsApi.sendRequest(user.username);
      setFriendshipStatus('pending');
      setAlertMessage('Friend request sent successfully!');
      setShowAlert(true);
    } catch (error: any) {
      console.error('Error sending friend request:', error);
      const errorMsg = error.response?.data?.detail || 'Failed to send friend request';
      setAlertMessage(errorMsg);
      setShowAlert(true);
    } finally {
      setSendingRequest(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Beer className="w-16 h-16 text-amber-400 mx-auto mb-4 animate-float" />
          <div className="text-xl text-amber-300">Loading profile...</div>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950">
        <div className="bg-gradient-to-br from-stone-900/90 to-stone-800/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-amber-900/30 p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-900/30 border border-red-700/30 rounded-full mx-auto mb-4 flex items-center justify-center">
              <Beer className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-amber-100 mb-2">User Not Found</h2>
            <p className="text-amber-200/70 mb-6">{error || 'The user you are looking for does not exist.'}</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full px-6 py-3 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white rounded-xl font-semibold hover:from-amber-600 hover:via-orange-600 hover:to-amber-700 transition-all shadow-lg shadow-amber-900/50"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="bg-stone-900/90 backdrop-blur-xl shadow-lg border-b border-amber-900/30 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 text-amber-300 hover:text-amber-200 transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-400 via-orange-500 to-amber-600 bg-clip-text text-transparent">
            DrinkBuddies
          </h1>
          <div className="w-20"></div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-gradient-to-br from-stone-900/90 to-stone-800/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-amber-900/30 p-8">
          {/* Profile Header */}
          <div className="text-center mb-6">
            <div className="w-24 h-24 bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 rounded-full mx-auto flex items-center justify-center text-4xl text-white font-bold shadow-lg shadow-amber-900/50 mb-4">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <h2 className="text-3xl font-bold text-amber-100 mb-2">
              {user.username}
            </h2>
            <p className="text-amber-300/70">{user.email}</p>
          </div>

          {/* Stats */}
          <div className="bg-gradient-to-r from-amber-900/30 to-orange-900/30 rounded-xl p-6 text-center border border-amber-700/30 mb-6">
            <div className="text-5xl font-bold text-amber-400 mb-2">
              {user.days_sober}
            </div>
            <div className="text-amber-200/70 flex items-center gap-2 justify-center">
              <Beer className="w-5 h-5" />
              Days Drinking
            </div>
          </div>

          {/* Bio */}
          {user.bio && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-amber-100 mb-3">Bio</h3>
              <p className="text-amber-200/80 bg-stone-800/30 rounded-xl p-4 border border-amber-900/20">
                {user.bio}
              </p>
            </div>
          )}

          {/* Favorite Drinks */}
          {user.favorite_drinks && user.favorite_drinks.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-amber-100 mb-3 flex items-center gap-2">
                <Beer className="w-5 h-5" />
                Favorite Drinks
              </h3>
              <div className="flex flex-wrap gap-2">
                {user.favorite_drinks.map((drink) => (
                  <span 
                    key={drink} 
                    className="px-3 py-2 bg-amber-900/30 border border-amber-700/30 rounded-lg text-sm text-amber-100"
                  >
                    {drink}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Drinking Since */}
          {user.sober_date && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-amber-100 mb-2">Drinking Since</h3>
              <p className="text-amber-200/70">
                {new Date(user.sober_date).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          {currentUser && currentUser.username !== user.username && (
            <div className="flex gap-3 mt-6">
              {friendshipStatus === 'none' && (
                <button
                  onClick={handleSendFriendRequest}
                  disabled={sendingRequest}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white rounded-xl font-semibold hover:from-amber-600 hover:via-orange-600 hover:to-amber-700 transition-all shadow-lg shadow-amber-900/50 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <UserPlus className="w-5 h-5" />
                  {sendingRequest ? 'Sending...' : 'Add Friend'}
                </button>
              )}
              
              {friendshipStatus === 'pending' && (
                <button
                  disabled
                  className="flex-1 px-6 py-3 bg-amber-900/30 border border-amber-700/30 text-amber-300 rounded-xl font-semibold flex items-center justify-center gap-2 cursor-not-allowed"
                >
                  <Clock className="w-5 h-5" />
                  Request Pending
                </button>
              )}
              
              {friendshipStatus === 'friends' && (
                <button
                  onClick={() => router.push(`/messages/${username}`)}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white rounded-xl font-semibold hover:from-amber-600 hover:via-orange-600 hover:to-amber-700 transition-all shadow-lg shadow-amber-900/50 flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-5 h-5" />
                  Send Message
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Alert Modal */}
      {showAlert && (
        <Alert
          message={alertMessage}
          onClose={() => setShowAlert(false)}
        />
      )}
    </div>
  );
}
