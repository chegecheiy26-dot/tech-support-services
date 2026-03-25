import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AuthView = 'login' | 'signup' | 'forgot';

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { signIn, signUp } = useAuth();
  const [view, setView] = useState<AuthView>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setUsername('');
    setFullName('');
    setErrors({});
    setServerError('');
    setSuccess(null);
  };

  const switchView = (v: AuthView) => {
    setView(v);
    resetForm();
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (view === 'signup') {
      if (!username.trim()) e.username = 'Username is required';
      else if (username.length < 3) e.username = 'Min 3 characters';
      if (!fullName.trim()) e.fullName = 'Full name is required';
    }
    if (!email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Invalid email format';
    if (view !== 'forgot') {
      if (!password) e.password = 'Password is required';
      else if (password.length < 6) e.password = 'Min 6 characters';
    }
    if (view === 'signup' && password !== confirmPassword) {
      e.confirmPassword = 'Passwords do not match';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    setServerError('');

    try {
      if (view === 'login') {
        const { error } = await signIn(email, password);
        if (error) {
          setServerError(error);
        } else {
          setSuccess('Login successful! Welcome back.');
          setTimeout(() => { onClose(); resetForm(); }, 1500);
        }
      } else if (view === 'signup') {
        const { error } = await signUp(email, password, username, fullName);
        if (error) {
          setServerError(error);
        } else {
          setSuccess('Account created successfully! You are now signed in.');
          setTimeout(() => { onClose(); resetForm(); }, 2000);
        }
      } else if (view === 'forgot') {
        setSuccess('Password reset email is not set up on the live site yet. Please contact support or create a new password through the account settings after signing in.');
      }
    } catch (err: any) {
      setServerError(err.message || 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const titles: Record<AuthView, { heading: string; sub: string }> = {
    login: { heading: 'Welcome Back', sub: 'Sign in to access your dashboard' },
    signup: { heading: 'Create Account', sub: 'Join us and explore our services' },
    forgot: { heading: 'Reset Password', sub: 'Password reset email is not configured on the live site yet' },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0a1628] via-[#1a237e] to-[#0d47a1] p-6 pb-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-4 left-8 w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
            <div className="absolute top-12 right-12 w-1.5 h-1.5 bg-blue-300 rounded-full animate-pulse" />
            <div className="absolute bottom-6 left-1/3 w-1 h-1 bg-white rounded-full animate-pulse" />
          </div>
          <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </div>
          <h2 className="text-2xl font-bold text-white">{titles[view].heading}</h2>
          <p className="text-blue-200 text-sm mt-1">{titles[view].sub}</p>
        </div>

        {/* Body */}
        <div className="p-6 -mt-4 bg-white rounded-t-2xl relative">
          {success ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800">Success!</h3>
              <p className="text-gray-500 mt-1 text-sm">{success}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {serverError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                  {serverError}
                </div>
              )}

              {/* Username (signup) */}
              {view === 'signup' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Username</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    </div>
                    <input type="text" value={username} onChange={e => { setUsername(e.target.value); setErrors(p => ({ ...p, username: '' })); }}
                      className={`w-full pl-10 pr-4 py-3 rounded-xl border-2 ${errors.username ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-blue-500'} outline-none transition-all text-gray-800 placeholder-gray-400`}
                      placeholder="Choose a username" />
                  </div>
                  {errors.username && <p className="text-red-500 text-xs mt-1 ml-1">{errors.username}</p>}
                </div>
              )}

              {/* Full Name (signup) */}
              {view === 'signup' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    </div>
                    <input type="text" value={fullName} onChange={e => { setFullName(e.target.value); setErrors(p => ({ ...p, fullName: '' })); }}
                      className={`w-full pl-10 pr-4 py-3 rounded-xl border-2 ${errors.fullName ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-blue-500'} outline-none transition-all text-gray-800 placeholder-gray-400`}
                      placeholder="Your full name" />
                  </div>
                  {errors.fullName && <p className="text-red-500 text-xs mt-1 ml-1">{errors.fullName}</p>}
                </div>
              )}

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                  </div>
                  <input type="email" value={email} onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: '' })); setServerError(''); }}
                    className={`w-full pl-10 pr-4 py-3 rounded-xl border-2 ${errors.email ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-blue-500'} outline-none transition-all text-gray-800 placeholder-gray-400`}
                    placeholder="you@example.com" />
                </div>
                {errors.email && <p className="text-red-500 text-xs mt-1 ml-1">{errors.email}</p>}
              </div>

              {/* Password */}
              {view !== 'forgot' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    </div>
                    <input type={showPassword ? 'text' : 'password'} value={password}
                      onChange={e => { setPassword(e.target.value); setErrors(p => ({ ...p, password: '' })); setServerError(''); }}
                      className={`w-full pl-10 pr-12 py-3 rounded-xl border-2 ${errors.password ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-blue-500'} outline-none transition-all text-gray-800 placeholder-gray-400`}
                      placeholder="Min 6 characters" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      )}
                    </button>
                  </div>
                  {errors.password && <p className="text-red-500 text-xs mt-1 ml-1">{errors.password}</p>}
                </div>
              )}

              {/* Confirm Password (signup) */}
              {view === 'signup' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    </div>
                    <input type={showPassword ? 'text' : 'password'} value={confirmPassword}
                      onChange={e => { setConfirmPassword(e.target.value); setErrors(p => ({ ...p, confirmPassword: '' })); }}
                      className={`w-full pl-10 pr-4 py-3 rounded-xl border-2 ${errors.confirmPassword ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-blue-500'} outline-none transition-all text-gray-800 placeholder-gray-400`}
                      placeholder="Re-enter password" />
                  </div>
                  {errors.confirmPassword && <p className="text-red-500 text-xs mt-1 ml-1">{errors.confirmPassword}</p>}
                </div>
              )}

              {/* Forgot password link */}
              {view === 'login' && (
                <div className="flex items-center justify-end">
                  <button type="button" onClick={() => switchView('forgot')} className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                    Forgot password?
                  </button>
                </div>
              )}

              {/* Submit */}
              <button type="submit" disabled={isSubmitting}
                className="w-full py-3.5 bg-gradient-to-r from-[#1a237e] to-[#0d47a1] text-white font-bold rounded-xl hover:from-[#0d47a1] hover:to-[#1565c0] transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    Processing...
                  </>
                ) : view === 'login' ? 'Sign In' : view === 'signup' ? 'Create Account' : 'Send Reset Link'}
              </button>

              {/* Switch views */}
              <div className="text-center text-sm text-gray-500 mt-4 space-y-1">
                {view === 'login' && (
                  <p>Don't have an account?{' '}
                    <button type="button" onClick={() => switchView('signup')} className="text-blue-600 hover:text-blue-800 font-semibold">Sign Up</button>
                  </p>
                )}
                {view === 'signup' && (
                  <p>Already have an account?{' '}
                    <button type="button" onClick={() => switchView('login')} className="text-blue-600 hover:text-blue-800 font-semibold">Sign In</button>
                  </p>
                )}
                {view === 'forgot' && (
                  <p>Remember your password?{' '}
                    <button type="button" onClick={() => switchView('login')} className="text-blue-600 hover:text-blue-800 font-semibold">Sign In</button>
                  </p>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
