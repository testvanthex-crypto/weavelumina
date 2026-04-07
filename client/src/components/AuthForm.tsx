import { useState } from 'react';
import { useLocation } from 'wouter';
import { register, login, logout } from '@/lib/auth';

export default function AuthForm() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!email || !password) {
      setError('Email and password are required.');
      return;
    }
    if (mode === 'register') {
      const { error } = await register(email, password);
      if (error) setError(error.message);
      else setSuccess('Registration successful! Check your email for confirmation.');
    } else {
      const { error } = await login(email, password);
      if (error) setError(error.message);
      else {
        setSuccess('Login successful!');
        setTimeout(() => {
          setLocation('/');
        }, 500); // brief delay for UX
      }
    }
  };

  return (
    <div className="max-w-sm mx-auto mt-10 p-6 bg-[#111] rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-white">{mode === 'login' ? 'Login' : 'Register'}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full p-2 rounded bg-[#222] text-white border border-[#333]"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full p-2 rounded bg-[#222] text-white border border-[#333]"
        />
        {error && <div className="text-red-400 text-sm">{error}</div>}
        {success && <div className="text-green-400 text-sm">{success}</div>}
        <button
          type="submit"
          className="w-full bg-[#C9A84C] text-[#050505] font-semibold py-2 rounded hover:bg-[#D4B85C]"
        >
          {mode === 'login' ? 'Login' : 'Register'}
        </button>
      </form>
      <div className="flex justify-between mt-4">
        <button
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          className="text-xs text-[#C9A84C] hover:underline"
        >
          {mode === 'login' ? 'Need an account? Register' : 'Already have an account? Login'}
        </button>
        <button
          onClick={logout}
          className="text-xs text-gray-400 hover:underline"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
