'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { friendsApi } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';
import type { Friend, FriendRequest } from '@/types';
import { Users, UserPlus, ArrowLeft, Check, X, MessageCircle, Beer, Frown } from 'lucide-react';
import Alert from '@/components/Alert';

export default function FriendsPage() {
  const router = useRouter();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [friendUsername, setFriendUsername] = useState('');
  const [loading, setLoading] = useState(true);
  const [alertMessage, setAlertMessage] = useState('');
  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/');
      return;
    }
    loadData();
  }, [router]);

  const loadData = async () => {
    try {
      const [friendsList, requestsList] = await Promise.all([
        friendsApi.getFriends(),
        friendsApi.getRequests(),
      ]);
      setFriends(friendsList);
      setRequests(requestsList);
    } catch (error) {
      console.error('Error loading friends:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await friendsApi.sendRequest(friendUsername);
      setFriendUsername('');
      setAlertMessage('Friend request sent!');
      setShowAlert(true);
      await loadData();
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail;
      if (typeof errorMsg === 'string') {
        setAlertMessage(errorMsg);
      } else if (Array.isArray(errorMsg)) {
        const msg = errorMsg.map((e: any) => e.msg).join(', ');
        setAlertMessage(msg);
      } else {
        setAlertMessage('Error sending request');
      }
      setShowAlert(true);
    }
  };

  const handleAccept = async (requestId: string) => {
    try {
      await friendsApi.acceptRequest(requestId);
      await loadData();
    } catch (error) {
      console.error('Error accepting request:', error);
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      await friendsApi.rejectRequest(requestId);
      await loadData();
    } catch (error) {
      console.error('Error rejecting request:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Users className="w-16 h-16 text-amber-400 mx-auto mb-4 animate-float" />
          <div className="text-xl text-amber-300 mb-6">Loading buddies...</div>
          
          {/* Skeleton Loading */}
          <div className="max-w-2xl mx-auto space-y-3 px-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-stone-900/50 rounded-xl p-4 border border-amber-900/20 animate-fade-in" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full skeleton"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 skeleton rounded w-1/3"></div>
                    <div className="h-3 skeleton rounded w-1/4"></div>
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
      <header className="bg-stone-900/90 backdrop-blur-xl shadow-lg border-b border-amber-900/30 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-400 via-orange-500 to-amber-600 bg-clip-text text-transparent flex items-center gap-2">
            <Users className="w-7 h-7 text-amber-500" />
            Friends
          </h1>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 text-amber-300 hover:text-amber-200 transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Add Friend */}
        <div className="bg-gradient-to-br from-stone-900/90 to-stone-800/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-amber-900/30 p-6">
          <h2 className="text-lg font-semibold text-amber-100 mb-4 flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Add Drinking Buddy
          </h2>
          <form onSubmit={handleSendRequest} className="flex gap-3">
            <input
              type="text"
              value={friendUsername}
              onChange={(e) => setFriendUsername(e.target.value)}
              placeholder="Enter username..."
              className="flex-1 px-4 py-2 bg-stone-800/50 border border-amber-900/50 rounded-xl focus:ring-2 focus:ring-amber-500 text-amber-50 placeholder-amber-300/30"
              required
            />
            <button
              type="submit"
              className="px-6 py-2 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white rounded-xl font-semibold hover:from-amber-600 hover:via-orange-600 hover:to-amber-700 transition-all shadow-lg shadow-amber-900/50 flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Send Request
            </button>
          </form>
        </div>

        {/* Friend Requests */}
        {requests.length > 0 && (
          <div className="bg-gradient-to-br from-stone-900/90 to-stone-800/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-amber-900/30 p-6">
            <h2 className="text-lg font-semibold text-amber-100 mb-4 flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Friend Requests ({requests.length})
            </h2>
            <div className="space-y-3">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between p-3 bg-stone-800/30 border border-amber-900/30 rounded-xl"
                >
                  <div>
                    <p className="font-medium text-amber-100">
                      {req.user_username}
                    </p>
                    <p className="text-sm text-amber-300/50">
                      {new Date(req.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAccept(req.id)}
                      className="px-4 py-2 bg-green-900/50 border border-green-700/50 text-green-200 rounded-lg hover:bg-green-800/50 transition-all flex items-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      Accept
                    </button>
                    <button
                      onClick={() => handleReject(req.id)}
                      className="px-4 py-2 bg-red-900/50 border border-red-700/50 text-red-200 rounded-lg hover:bg-red-800/50 transition-all flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Friends List */}
        <div className="bg-gradient-to-br from-stone-900/90 to-stone-800/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-amber-900/30 p-6">
          <h2 className="text-lg font-semibold text-amber-100 mb-4 flex items-center gap-2">
            <Beer className="w-5 h-5" />
            My Drinking Buddies ({friends.length})
          </h2>
          {friends.length === 0 ? (
            <div className="text-center py-8">
              <Frown className="w-12 h-12 text-amber-500/50 mx-auto mb-3" />
              <p className="text-amber-200/70">
                No buddies yet. Add some friends to get started!
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {friends.map((friend, index) => (
                <div
                  key={friend.username}
                  className="flex items-center justify-between p-4 bg-stone-800/30 border border-amber-900/30 rounded-xl hover:border-amber-700/50 transition-smooth animate-fade-in"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-amber-900/50">
                      {friend.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-amber-100">
                        {friend.username}
                      </h3>
                      <p className="text-sm text-amber-300/70 flex items-center gap-1">
                        <Beer className="w-3 h-3" />
                        {friend.days_sober} days drinking
                      </p>
                      {friend.bio && (
                        <p className="text-sm text-amber-200/60 mt-1">
                          {friend.bio}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => router.push(`/messages/${friend.username}`)}
                    className="px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-lg hover:from-orange-700 hover:to-amber-700 transition-all shadow-lg shadow-orange-900/30 flex items-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Message
                  </button>
                </div>
              ))}
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
