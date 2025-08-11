import React, { useState } from 'react';
import { User, Lock, AlertCircle } from 'lucide-react';

interface LoginFormProps {
  role: 'admin' | 'vendor' | 'team_leader' | 'worker';
  onLogin: (userId: string, password: string) => Promise<void>;
  loading?: boolean;
  error?: string;
}

const LoginForm: React.FC<LoginFormProps> = ({ role, onLogin, loading, error }) => {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userId.trim() && password.trim()) {
      await onLogin(userId.trim(), password);
    }
  };

  const getRoleTitle = () => {
    switch (role) {
      case 'admin': return 'Admin Login';
      case 'vendor': return 'Audit Vendor Login';
      case 'team_leader': return 'Team Leader Login';
      case 'worker': return 'Worker Login';
      default: return 'Login';
    }
  };

  const getRoleDescription = () => {
    switch (role) {
      case 'admin': return 'Full system access and monitoring';
      case 'vendor': return 'Manage team leaders and workers';
      case 'team_leader': return 'Create workers and approve OTP';
      case 'worker': return 'Counting activities';
      default: return '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
            <User className="w-8 h-8 text-indigo-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{getRoleTitle()}</h1>
          <p className="text-gray-600 text-sm">{getRoleDescription()}</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="userId" className="block text-sm font-medium text-gray-700 mb-2">
              User ID
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                id="userId"
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                placeholder="Enter your user ID"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                placeholder="Enter your password"
                required
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !userId.trim() || !password.trim()}
            className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <a
            href="/"
            className="text-indigo-600 hover:text-indigo-700 text-sm font-medium transition-colors"
          >
            ← Back to Role Selection
          </a>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;