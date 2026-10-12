import React, { useState } from 'react';
import { X, Lock, Mail, User, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '@quickcommerce/shared-types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login, register, loginDemo } = useAuth();
  const [isLoginTab, setIsLoginTab] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('CUSTOMER');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (isLoginTab) {
        await login(email, password);
      } else {
        await register(name, email, password, role);
      }
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoClick = async (demoRole: UserRole) => {
    setError(null);
    setIsLoading(true);
    try {
      await loginDemo(demoRole);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to authenticate demo account.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div onClick={onClose} className="absolute inset-0 bg-neutral-900/50 backdrop-blur-xs transition-opacity" />

      {/* Modal Dialog */}
      <div className="relative bg-white rounded-3xl border border-neutral-200/90 shadow-2xl w-full max-w-md overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/70">
          <div>
            <h3 className="text-base font-bold text-neutral-900">
              {isLoginTab ? 'Sign in to QuickCommerce' : 'Create an Account'}
            </h3>
            <p className="text-xs text-neutral-500">Access instant grocery delivery and order tracking</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1-Click Quick Demo Switcher */}
        <div className="p-4 bg-emerald-50/70 border-b border-emerald-100">
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-brand-600" />
            <span>Instant Demo Logins (1-Click)</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleDemoClick('CUSTOMER')}
              className="py-1.5 px-2 bg-white hover:bg-emerald-100/60 border border-emerald-200 rounded-xl text-[11px] font-bold text-emerald-900 transition-colors shadow-2xs"
            >
              🛒 Customer
            </button>
            <button
              type="button"
              onClick={() => handleDemoClick('ADMIN')}
              className="py-1.5 px-2 bg-white hover:bg-emerald-100/60 border border-emerald-200 rounded-xl text-[11px] font-bold text-emerald-900 transition-colors shadow-2xs"
            >
              🛠️ Admin
            </button>
            <button
              type="button"
              onClick={() => handleDemoClick('DELIVERY_PARTNER')}
              className="py-1.5 px-2 bg-white hover:bg-emerald-100/60 border border-emerald-200 rounded-xl text-[11px] font-bold text-emerald-900 transition-colors shadow-2xs"
            >
              🛵 Rider
            </button>
          </div>
        </div>

        {/* Tab Toggle */}
        <div className="flex border-b border-neutral-100">
          <button
            onClick={() => { setIsLoginTab(true); setError(null); }}
            className={`flex-1 py-3 text-xs font-bold border-b-2 transition-all ${
              isLoginTab ? 'border-brand-600 text-brand-700 bg-brand-50/30' : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setIsLoginTab(false); setError(null); }}
            className={`flex-1 py-3 text-xs font-bold border-b-2 transition-all ${
              !isLoginTab ? 'border-brand-600 text-brand-700 bg-brand-50/30' : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            Register
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-700 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {!isLoginTab && (
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Aarav Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-900 focus:bg-white focus:border-brand-500 outline-none transition-all"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-900 focus:bg-white focus:border-brand-500 outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-900 focus:bg-white focus:border-brand-500 outline-none transition-all"
              />
            </div>
          </div>

          {!isLoginTab && (
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">Account Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-900 focus:bg-white focus:border-brand-500 outline-none"
              >
                <option value="CUSTOMER">Customer (Shopping App)</option>
                <option value="DELIVERY_PARTNER">Delivery Partner (Rider)</option>
                <option value="ADMIN">System Administrator</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-extrabold shadow-md shadow-brand-600/20 active:scale-98 transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : isLoginTab ? (
              'Sign In'
            ) : (
              'Create Account'
            )}
          </button>
        </form>

      </div>
    </div>
  );
};
