'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { friendsApi } from '@/lib/api';
import { isAuthenticated, getToken } from '@/lib/auth';
import type { PrivateMessage } from '@/types';
import { MessageCircle, ArrowLeft, Send, Beer, Loader2 } from 'lucide-react';
import BACCalculator from '@/components/BACCalculator';

export default function MessagesPage() {
  const router = useRouter();
  const params = useParams();
  const friendUsername = params.friendUsername as string;
  
  const [messages, setMessages] = useState<PrivateMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [myUsername, setMyUsername] = useState('');
  const [connected, setConnected] = useState(false);
  const [showBACCalculator, setShowBACCalculator] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/');
      return;
    }

    // Parse JWT to get username
    const token = getToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setMyUsername(payload.sub);
      } catch (error) {
        console.error('Error parsing token:', error);
      }
    }

    // Load initial messages
    loadMessages();
    
    // Connect to WebSocket only once
    connectWebSocket();
    
    return () => {
      // Cleanup WebSocket on unmount
      console.log('Cleaning up WebSocket');
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [friendUsername]); // Removed router dependency to prevent reconnections

  const connectWebSocket = () => {
    const token = getToken();
    if (!token) return;

    // Prevent multiple connections
    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) {
      console.log('WebSocket already connected or connecting');
      return;
    }

    const wsUrl = `ws://localhost:8000/api/chat/ws/private/${friendUsername}?token=${token}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connected');
      setConnected(true);
      setError('');
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'system') {
        console.log('System message:', data.content);
      } else if (data.type === 'private_message') {
        // Add new message to list (avoid duplicates)
        setMessages((prev) => {
          // Check if message already exists
          const exists = prev.some(msg => msg.id === data.id);
          if (exists) return prev;
          
          const newMsg: PrivateMessage = {
            id: data.id,
            sender_id: data.sender_id,
            sender_username: data.sender_username,
            receiver_id: data.receiver_id,
            receiver_username: data.receiver_username,
            message: data.content,
            created_at: data.timestamp,
            read: data.read
          };
          return [...prev, newMsg];
        });
      }
    };

    ws.onerror = (error) => {
      // Only log error if we're actually trying to maintain a connection
      if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
        console.error('WebSocket error:', error);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setConnected(false);
      // Only try to reconnect if we're still on this page and authenticated
      if (isAuthenticated() && wsRef.current === ws) {
        setTimeout(() => {
          if (isAuthenticated() && wsRef.current === ws) {
            connectWebSocket();
          }
        }, 3000);
      }
    };

    wsRef.current = ws;
  };

  const loadMessages = async () => {
    try {
      const data = await friendsApi.getConversation(friendUsername);
      setMessages(data);
      setError('');
    } catch (error: any) {
      console.error('Error loading messages:', error);
      const errorMsg = error.response?.data?.detail;
      if (typeof errorMsg === 'string') {
        setError(errorMsg);
      } else {
        setError('Unable to load messages. Make sure you are friends with this user.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    try {
      // Send via WebSocket
      wsRef.current.send(JSON.stringify({
        content: newMessage
      }));
      setNewMessage('');
      setError('');
    } catch (error: any) {
      console.error('Error sending message:', error);
      setError('Failed to send message');
    }
  };

  const handleSendBAC = (bac: number, drinks: any[]) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    // Count drinks by type
    const drinkCounts: { [key: string]: number } = {};
    drinks.forEach(d => {
      drinkCounts[d.type] = (drinkCounts[d.type] || 0) + 1;
    });
    
    // Format as "3x Beer, 2x Wine"
    const drinksList = Object.entries(drinkCounts)
      .map(([type, count]) => `${count}x ${type}`)
      .join(', ');
    
    // Special format for BAC messages that can be detected
    const message = `[BAC]${bac.toFixed(3)}|${drinksList}`;

    try {
      wsRef.current.send(JSON.stringify({
        content: message
      }));
      setError('');
    } catch (error: any) {
      console.error('Error sending BAC:', error);
      setError('Failed to send BAC');
    }
  };

  const renderMessage = (msg: PrivateMessage, isOwnMessage: boolean) => {
    // Check if message is a BAC message
    if (msg.message.startsWith('[BAC]')) {
      const [, data] = msg.message.split('[BAC]');
      const [bac, drinksList] = data.split('|');
      
      const bacValue = parseFloat(bac);
      const getBACColor = (bac: number): string => {
        if (bac < 0.5) return 'text-green-400';
        if (bac < 1.0) return 'text-yellow-400';
        if (bac < 1.5) return 'text-orange-400';
        if (bac < 2.0) return 'text-red-400';
        return 'text-red-600';
      };

      return (
        <div className={`max-w-xs lg:max-w-md ${isOwnMessage ? 'bg-gradient-to-br from-amber-500/20 to-orange-500/20' : 'bg-stone-800/50'} rounded-xl p-4 border ${isOwnMessage ? 'border-amber-700/30' : 'border-amber-900/30'} shadow-lg`}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-amber-900/30 border border-amber-700/30 rounded-full flex items-center justify-center">
              <Beer className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="text-xs text-amber-300/60 font-medium">Blood Alcohol Content</div>
              <div className={`text-2xl font-bold ${getBACColor(bacValue)}`}>
                {bac}‰
              </div>
            </div>
          </div>
          <div className="text-sm text-amber-200/70 mb-2">
            <span className="font-medium">Drinks:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {drinksList.split(', ').map((drink, i) => (
              <span 
                key={i}
                className="px-2 py-1 bg-amber-900/20 border border-amber-700/20 rounded text-xs text-amber-100"
              >
                {drink}
              </span>
            ))}
          </div>
          <div className={`text-xs mt-3 ${isOwnMessage ? 'text-amber-100/70' : 'text-amber-300/50'}`}>
            {new Date(msg.created_at).toLocaleTimeString()}
          </div>
        </div>
      );
    }

    // Regular text message
    return (
      <div
        className={`max-w-xs lg:max-w-md px-4 py-3 rounded-xl ${
          isOwnMessage
            ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white shadow-lg shadow-amber-900/50'
            : 'bg-stone-800/50 text-amber-100 border border-amber-900/30 shadow-lg'
        }`}
      >
        <div className="break-words whitespace-pre-wrap">{msg.message}</div>
        <div
          className={`text-xs mt-1 ${
            isOwnMessage ? 'text-amber-100/70' : 'text-amber-300/50'
          }`}
        >
          {new Date(msg.created_at).toLocaleTimeString()}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-amber-400 mx-auto mb-4 animate-spin" />
          <div className="text-xl text-amber-300">Loading messages...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-stone-900/90 backdrop-blur-xl shadow-lg border-b border-amber-900/30 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/friends')}
              className="px-4 py-2 text-amber-300 hover:text-amber-200 transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg shadow-amber-900/50">
              {friendUsername.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-bold text-amber-100">
                {friendUsername}
              </h1>
              {!connected && (
                <span className="text-xs text-amber-300/50">Connecting...</span>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-4xl w-full mx-auto flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {error && (
            <div className="bg-red-900/30 border border-red-700/50 text-red-200 px-4 py-3 rounded-xl text-center">
              {error}
            </div>
          )}
          {messages.length === 0 ? (
            <div className="text-center mt-8">
              <Beer className="w-16 h-16 text-amber-500/50 mx-auto mb-3 animate-float" />
              <p className="text-amber-200/70">
                No messages yet. Start the conversation!
              </p>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isOwnMessage = msg.sender_username === myUsername;
              return (
                <div
                  key={msg.id}
                  className={`flex ${
                    isOwnMessage ? 'justify-end' : 'justify-start'
                  } ${isOwnMessage ? 'animate-slide-in-right' : 'animate-slide-in-left'}`}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  {renderMessage(msg, isOwnMessage)}
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="bg-stone-900/90 backdrop-blur-xl border-t border-amber-900/30 p-4">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowBACCalculator(true)}
              disabled={!connected}
              className="px-4 py-3 bg-stone-700/50 border border-amber-900/30 text-amber-300 rounded-xl hover:bg-stone-600/50 transition-all disabled:opacity-50 flex items-center gap-2"
              title="Send BAC"
            >
              <Beer className="w-5 h-5" />
            </button>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message... 🍺"
              className="flex-1 px-4 py-3 bg-stone-800/50 border border-amber-900/50 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent text-amber-50 placeholder-amber-300/30"
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || !connected}
              className="px-6 py-3 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white rounded-xl font-semibold hover:from-amber-600 hover:via-orange-600 hover:to-amber-700 transition-all disabled:opacity-50 shadow-lg shadow-amber-900/50 flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Send
            </button>
          </form>
        </div>

        {/* BAC Calculator Modal */}
        {showBACCalculator && (
          <BACCalculator
            onClose={() => setShowBACCalculator(false)}
            onSend={handleSendBAC}
          />
        )}
      </div>
    </div>
  );
}
