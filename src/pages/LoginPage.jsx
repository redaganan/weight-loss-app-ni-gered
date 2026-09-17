import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, UserRound, Lock } from 'lucide-react';
import { api, storeUserSession } from '../services/api';

export default function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) return undefined;
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => {
      window.google?.accounts.id.initialize({
        client_id: clientId,
        callback: async ({ credential }) => {
          try {
            const { data } = await api.post('/auth/google', { credential });
            localStorage.setItem('token', data.token);
            storeUserSession(data.user._id, data.user);
            navigate(data.needsSetup ? '/setup' : '/');
          } catch (err) {
            setError(err.response?.data?.message || 'Google sign-in failed.');
          }
        },
      });
      window.google.accounts.id.renderButton(document.getElementById('google-sign-in'), { theme: 'filled_black', size: 'large', width: 350 });
    };
    document.head.appendChild(script);
    return () => script.remove();
  }, [navigate]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!otpSent) {
        await api.post('/auth/request-otp', { email: form.email, password: form.password, purpose: 'login' });
        setOtpSent(true);
        return;
      }
      const { data } = await api.post('/auth/verify-otp', { email: form.email, code: otp, purpose: 'login' });

      const user = data?.user || {
        _id: data?.userId,
        userId: data?.userId,
        email: form.email,
        name: 'Welcome back',
        token: data?.token,
      };

      const userId = user._id || user.userId || data?.userId;
      const savedUser = {
        ...user,
        _id: userId,
        userId,
        email: user.email || form.email,
        name: user.name || 'Welcome back',
      };

      if (userId) {
        localStorage.setItem('weightlossUserId', userId);
        localStorage.setItem('userAccountId', userId);
      }
      localStorage.setItem('user', JSON.stringify(savedUser));
      if (data?.token) {
        localStorage.setItem('token', data.token);
      }
      storeUserSession(userId, { ...savedUser, email: savedUser.email || form.email, userId });
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to sign in right now.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md py-12">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-8 shadow-xl shadow-slate-950/40">
        <div className="mb-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-400">Welcome back</p>
          <h1 className="mt-3 text-3xl font-black text-slate-100">Sign in</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Email</label>
            <div className="relative">
              <UserRound className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-500" />
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                className="w-full rounded-xl border border-slate-700 bg-slate-800 py-2.5 pl-10 pr-4 text-slate-100 outline-none transition focus:border-amber-500"
                placeholder="you@example.com"
              />
            </div>
          </div>

          {!otpSent && <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Password</label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-500" />
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                className="w-full rounded-xl border border-slate-700 bg-slate-800 py-2.5 pl-10 pr-4 text-slate-100 outline-none transition focus:border-amber-500"
                placeholder="Your password"
              />
            </div>
          </div>}

          {otpSent && (
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Email verification code</label>
                <input value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 4))} inputMode="numeric" pattern="[0-9]{4}" maxLength={4} required className="w-full rounded-xl border border-amber-500/50 bg-slate-800 px-4 py-2.5 text-center text-xl tracking-[0.4em] text-slate-100 outline-none focus:ring-2 focus:ring-amber-500" placeholder="0000" />
                <button type="button" onClick={() => { setOtpSent(false); setOtp(''); }} className="mt-2 text-xs text-amber-400">Use a different email</button>
              </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 px-5 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition hover:from-amber-600 hover:to-yellow-500 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? 'Please wait...' : otpSent ? 'Verify and sign in' : 'Send sign-in code'}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
        <div id="google-sign-in" className="mt-4 flex justify-center" />

        <p className="mt-5 text-center text-sm text-slate-400">
          New here? <Link to="/register" className="font-semibold text-amber-400">Create account</Link>
        </p>
      </div>
    </div>
  );
}
