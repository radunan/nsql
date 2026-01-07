'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { setToken } from '@/lib/auth';
import { Beer, Mail, Lock, User, Calendar, LogIn, UserPlus } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    sober_date: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        // Login
        const response = await authApi.login({
          username: formData.username,
          password: formData.password,
        });
        setToken(response.access_token);
        router.push('/dashboard');
      } else {
        // Register
        await authApi.register({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          sober_date: formData.sober_date || undefined,
        });
        // Auto-login after registration
        const response = await authApi.login({
          username: formData.username,
          password: formData.password,
        });
        setToken(response.access_token);
        router.push('/dashboard');
      }
    } catch (err: any) {
      // Handle validation errors from FastAPI
      if (err.response?.data?.detail) {
        const detail = err.response.data.detail;
        if (Array.isArray(detail)) {
          // Validation errors array
          const errorMessages = detail.map((error: any) => {
            const field = error.loc ? error.loc.join('.') : 'unknown';
            return `${field}: ${error.msg}`;
          }).join(', ');
          setError(errorMessages);
        } else if (typeof detail === 'string') {
          setError(detail);
        } else {
          setError('Validation error occurred');
        }
      } else {
        setError('An error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-orange-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/3 w-24 h-24 bg-amber-400/10 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative bg-stone-900/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-amber-900/30 p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-block mb-4">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-amber-900/50 animate-float">
              <Beer className="w-12 h-12 text-white" strokeWidth={2.5} />
            </div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-400 via-orange-500 to-amber-600 bg-clip-text text-transparent mb-2">
            DrinkBuddies
          </h1>
          <p className="text-amber-200/70">
            {isLogin ? 'Cheers! Welcome back!' : 'Join the party!'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-amber-100 mb-2 flex items-center gap-2">
              <User className="w-4 h-4" />
              Username
            </label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) =>
                setFormData({ ...formData, username: e.target.value })
              }
              className="w-full px-4 py-3 bg-stone-800/50 border border-amber-900/50 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent text-amber-50 placeholder-amber-300/30 transition-all"
              placeholder="Enter your username"
              required
            />
          </div>

          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-amber-100 mb-2 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="w-full px-4 py-3 bg-stone-800/50 border border-amber-900/50 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent text-amber-50 placeholder-amber-300/30 transition-all"
                placeholder="your@email.com"
                required={!isLogin}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-amber-100 mb-2 flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Password
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              className="w-full px-4 py-3 bg-stone-800/50 border border-amber-900/50 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent text-amber-50 placeholder-amber-300/30 transition-all"
              placeholder="••••••••"
              required
              minLength={8}
            />
          </div>

          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-amber-100 mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Drinking Since (Optional)
              </label>
              <input
                type="date"
                value={formData.sober_date}
                onChange={(e) =>
                  setFormData({ ...formData, sober_date: e.target.value })
                }
                className="w-full px-4 py-3 bg-stone-800/50 border border-amber-900/50 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent text-amber-50 transition-all"
              />
            </div>
          )}

          {error && (
            <div className="bg-red-900/30 border border-red-700/50 text-red-200 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white py-3 rounded-xl font-semibold hover:from-amber-600 hover:via-orange-600 hover:to-amber-700 transition-all disabled:opacity-50 shadow-lg shadow-amber-900/50 flex items-center justify-center gap-2"
          >
            {loading ? 'Loading...' : isLogin ? (
              <>
                <LogIn className="w-5 h-5" />
                Login
              </>
            ) : (
              <>
                <UserPlus className="w-5 h-5" />
                Register
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            className="text-amber-400 hover:text-amber-300 text-sm font-medium transition-colors"
          >
            {isLogin
              ? "Don't have an account? Join the party!"
              : 'Already drinking with us? Login'}
          </button>
        </div>

        <div className="mt-6 pt-6 border-t border-amber-900/30 text-center text-xs text-amber-200/50 flex items-center justify-center gap-2">
          <Beer className="w-4 h-4" />
          Connect. Drink. Enjoy.
        </div>
      </div>
    </div>
  );
}
