'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated, getToken } from '@/lib/auth';
import type { ChatMessage } from '@/types';
import { MessageCircle, ArrowLeft, Send, Beer } from 'lucide-react';

export default function ChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [connected, setConnected] = useState(false);
  const [username, setUsername] = useState('');
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
        setUsername(payload.sub);
      } catch (error) {
        console.error('Error parsing token:', error);
      }
    }

    // Connect to WebSocket
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';
    const ws = new WebSocket(`${wsUrl}/api/chat/ws?token=${token}`);

    ws.onopen = () => {
      console.log('Connected to chat');
      setConnected(true);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      // Skip system messages or convert to display format
      if (data.type === 'system') {
        console.log('System message:', data.content);
        return;
      }
      
      setMessages((prev) => {
        // Avoid duplicates
        if (data.id && prev.some(msg => msg.id === data.id)) {
          return prev;
        }
        return [...prev, data];
      });
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnected(false);
    };

    ws.onclose = () => {
      console.log('Disconnected from chat');
      setConnected(false);
    };

    wsRef.current = ws;

    return () => {
      ws.close();
    };
  }, [router]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !wsRef.current || !connected) return;

    wsRef.current.send(JSON.stringify({ content: newMessage }));
    setNewMessage('');
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-stone-900/90 backdrop-blur-xl shadow-lg border-b border-amber-900/30 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 text-amber-300 hover:text-amber-200 transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-400 via-orange-500 to-amber-600 bg-clip-text text-transparent flex items-center gap-2">
              <MessageCircle className="w-7 h-7 text-amber-500" />
              Bar Chat
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                connected ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <span className="text-sm text-amber-300/70">
              {connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </header>

      {/* Chat Container */}
      <div className="flex-1 max-w-4xl w-full mx-auto flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="text-center mt-8">
              <Beer className="w-16 h-16 text-amber-500/50 mx-auto mb-3" />
              <p className="text-amber-200/70">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isOwnMessage = msg.sender_username === username;
              return (
                <div
                  key={msg.id || index}
                  className={`flex ${
                    isOwnMessage ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-3 rounded-xl ${
                      isOwnMessage
                        ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white shadow-lg shadow-amber-900/50'
                        : 'bg-stone-800/50 text-amber-100 border border-amber-900/30 shadow-lg'
                    }`}
                  >
                    {!isOwnMessage && (
                      <div className="text-xs font-semibold mb-1 text-amber-400">
                        {msg.sender_username}
                      </div>
                    )}
                    <div className="break-words">{msg.content}</div>
                    <div
                      className={`text-xs mt-1 ${
                        isOwnMessage ? 'text-amber-100/70' : 'text-amber-300/50'
                      }`}
                    >
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="bg-stone-900/90 backdrop-blur-xl border-t border-amber-900/30 p-4">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message... 🍺"
              className="flex-1 px-4 py-3 bg-stone-800/50 border border-amber-900/50 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent text-amber-50 placeholder-amber-300/30"
              disabled={!connected}
            />
            <button
              type="submit"
              disabled={!connected || !newMessage.trim()}
              className="px-6 py-3 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white rounded-xl font-semibold hover:from-amber-600 hover:via-orange-600 hover:to-amber-700 transition-all disabled:opacity-50 shadow-lg shadow-amber-900/50 flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
