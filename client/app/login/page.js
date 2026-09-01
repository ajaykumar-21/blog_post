'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, saveSession } from '../../lib/api';

export default function LoginPage() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const router = useRouter();
  const register = mode === 'register';

  const submit = async (event) => {
    event.preventDefault();
    try {
      const session = await api(`/auth/${register ? 'register' : 'login'}`, { method: 'POST', body: JSON.stringify(form) });
      saveSession(session);
      router.push('/');
    } catch (requestError) { setError(requestError.message); }
  };

  return <main className="auth-page"><Link href="/" className="back">← Back to stories</Link><section className="auth-layout"><div className="auth-intro"><span className="mark">S</span><span className="eyebrow">STORYLINE COMMUNITY</span><h1>Every good idea deserves an audience.</h1><p>Publish your perspective, discover thoughtful work, and join conversations that move ideas forward.</p><div className="auth-points"><span>✦ Write meaningful posts</span><span>✦ Join threaded discussions</span><span>✦ Discover fresh perspectives</span></div></div><section className="auth-card"><span className="eyebrow">{register ? 'START YOUR STORY' : 'WELCOME BACK'}</span><h2>{register ? 'Create your account' : 'Sign in to Storyline'}</h2><p>{register ? 'It only takes a moment to join the conversation.' : 'Pick up right where you left off.'}</p>{error && <p className="error">{error}</p>}<form onSubmit={submit}>{register && <input placeholder="Your name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />}<input type="email" placeholder="Email address" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /><input type="password" placeholder="Password (at least 8 characters)" minLength="8" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required /><button>{register ? 'Create account' : 'Sign in'}</button></form><button className="text-button" onClick={() => { setMode(register ? 'login' : 'register'); setError(''); }}>{register ? 'Already have an account? Sign in' : 'New here? Create an account'}</button></section></section></main>;
}
