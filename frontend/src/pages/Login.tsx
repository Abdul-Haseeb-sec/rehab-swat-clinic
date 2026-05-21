import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Eye, EyeOff } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const form = new URLSearchParams();
      form.append('username', email);
      form.append('password', password);
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form.toString(),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Login failed');
      }
      const data = await res.json();
      navigate('/2fa', { state: { tokenData: data } });
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-physio-deep flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-teal-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-teal-700/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/30 mb-4">
            <Activity className="w-7 h-7 text-teal-400" />
          </div>
          <h1 className="font-display text-[2rem] font-light text-bone-100">
            Rehab Swat <em className="italic text-teal-400">CMS</em>
          </h1>
          <p className="text-[.78rem] text-bone-600 mt-1">Rehabilitation & Physiotherapy Management</p>
        </div>

        {/* Card */}
        <div className="bg-physio-card border border-teal-500/15 rounded-3xl p-8 shadow-[0_32px_80px_rgba(0,0,0,0.5)]">
          <div className="mb-6">
            <h2 className="text-[1rem] font-semibold text-bone-100">Sign in to your account</h2>
            <p className="text-[.75rem] text-bone-600 mt-0.5">Enter your clinic credentials to continue</p>
          </div>

          {/* Hint */}
          <div className="bg-teal-500/5 border border-teal-500/15 rounded-lg px-4 py-3 mb-6">
            <p className="text-[.68rem] text-teal-400 font-semibold mb-1 uppercase tracking-widest">Demo Credentials</p>
            <p className="text-[.70rem] text-bone-600">Admin: <span className="text-bone-300 font-mono">admin@rehabswat.pk</span> / <span className="text-bone-300 font-mono">Admin@12345</span></p>
            <p className="text-[.70rem] text-bone-600 mt-0.5">Doctor: <span className="text-bone-300 font-mono">dr.yaqoob@rehabswat.pk</span> / <span className="text-bone-300 font-mono">Doctor@12345</span></p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-[.72rem] font-semibold text-bone-600 uppercase tracking-widest">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@rehabswat.pk"
                className="bg-physio-navy border border-teal-500/10 rounded-md text-bone-300 px-4 py-2.5 text-[.85rem] outline-none focus:border-teal-500 focus:shadow-[0_0_0_3px_rgba(20,184,166,0.1)] transition-all placeholder:text-bone-900/50"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[.72rem] font-semibold text-bone-600 uppercase tracking-widest">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••••"
                  className="w-full bg-physio-navy border border-teal-500/10 rounded-md text-bone-300 px-4 py-2.5 pr-10 text-[.85rem] outline-none focus:border-teal-500 focus:shadow-[0_0_0_3px_rgba(20,184,166,0.1)] transition-all placeholder:text-bone-900/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-bone-900 hover:text-bone-600 transition-colors"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2.5">
                <p className="text-red-400 text-[.75rem]">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 bg-teal-500 hover:bg-teal-400 disabled:opacity-60 disabled:cursor-not-allowed text-physio-deep py-3 rounded-md font-semibold text-[.85rem] transition-all hover:-translate-y-px hover:shadow-[0_8px_24px_rgba(20,184,166,0.35)]"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-[.65rem] text-bone-900 mt-6">
          Rehab Swat CMS v1.0.0 · Built by Abdul Haseeb
        </p>
      </div>
    </div>
  );
};

export default Login;
