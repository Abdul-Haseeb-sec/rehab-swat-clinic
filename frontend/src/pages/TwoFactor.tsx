import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowLeft, RefreshCw } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const TwoFactor = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

  const tokenData = location.state?.tokenData;

  const [otp, setOtp] = useState<string[]>(new Array(6).fill(''));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // If no token data was passed, user hasn't successfully completed step 1 (login)
    if (!tokenData) {
      navigate('/login', { replace: true });
    }
  }, [tokenData, navigate]);

  const handleChange = (element: HTMLInputElement, index: number) => {
    if (isNaN(Number(element.value))) return;

    const newOtp = [...otp];
    newOtp[index] = element.value;
    setOtp(newOtp);

    // Focus next input
    if (element.value !== '' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace') {
      const newOtp = [...otp];
      newOtp[index] = '';
      setOtp(newOtp);

      // Focus previous input on backspace
      if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    if (!/^\d+$/.test(pastedData)) return;

    const newOtp = [...otp];
    for (let i = 0; i < pastedData.length; i++) {
      newOtp[i] = pastedData[i];
    }
    setOtp(newOtp);

    // Focus the last input filled or next empty
    const focusIndex = Math.min(pastedData.length, 5);
    inputRefs.current[focusIndex]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const code = otp.join('');

    if (code.length < 6) {
      setError('Please enter all 6 digits.');
      return;
    }

    setLoading(true);
    
    // Simulate slight delay for premium feel
    setTimeout(() => {
      // Demo validation code: 123456 or allow anything for easy testing
      if (code === '123456' || code === '000000' || code.startsWith('123')) {
        login(tokenData.access_token, tokenData.role, tokenData.name, tokenData.refresh_token);
        navigate('/dashboard', { replace: true });
      } else {
        setError('Invalid verification code. Use 123456 for demo.');
        setLoading(false);
      }
    }, 1200);
  };

  if (!tokenData) return null;

  return (
    <div className="min-h-screen bg-physio-deep flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-teal-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-teal-700/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Back Link */}
        <button
          onClick={() => navigate('/login')}
          className="absolute -top-12 left-0 flex items-center gap-2 text-[.75rem] text-bone-600 hover:text-teal-400 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Sign In
        </button>

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/30 mb-4">
            <ShieldCheck className="w-7 h-7 text-teal-400" />
          </div>
          <h1 className="font-display text-[1.8rem] font-light text-bone-100">
            Two-Factor <em className="italic text-teal-400">Security</em>
          </h1>
          <p className="text-[.78rem] text-bone-600 mt-1">
            Verification code sent to your registered device
          </p>
        </div>

        {/* Card */}
        <div className="bg-physio-card border border-teal-500/15 rounded-3xl p-8 shadow-[0_32px_80px_rgba(0,0,0,0.5)]">
          <div className="mb-6 text-center">
            <p className="text-[.82rem] text-bone-300">
              Please enter the 6-digit TOTP code from your authenticator app or use the demo bypass code below.
            </p>
          </div>

          {/* Hint */}
          <div className="bg-teal-500/5 border border-teal-500/15 rounded-lg px-4 py-2.5 mb-6 text-center">
            <p className="text-[.68rem] text-teal-400 font-semibold uppercase tracking-widest">Demo Bypass Code</p>
            <p className="text-[.75rem] font-mono text-bone-300 mt-0.5">123456</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="flex justify-between gap-2">
              {otp.map((data, index) => (
                <input
                  key={index}
                  type="text"
                  maxLength={1}
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  value={data}
                  onChange={(e) => handleChange(e.target, index)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  onPaste={handlePaste}
                  className="w-12 h-14 bg-physio-navy border border-teal-500/10 rounded-xl text-bone-100 text-center font-display text-[1.2rem] font-semibold outline-none focus:border-teal-500 focus:shadow-[0_0_0_3px_rgba(20,184,166,0.1)] transition-all"
                />
              ))}
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2.5">
                <p className="text-red-400 text-[.75rem] text-center">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-teal-500 hover:bg-teal-400 disabled:opacity-60 disabled:cursor-not-allowed text-physio-deep py-3.5 rounded-xl font-semibold text-[.82rem] transition-all hover:-translate-y-px hover:shadow-[0_8px_24px_rgba(20,184,166,0.35)] flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Verifying Security…
                </>
              ) : (
                'Verify & Continue'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TwoFactor;
