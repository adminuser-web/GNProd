import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GoldButton } from './GoldButton';
import { clsx } from 'clsx';
import { Skeleton } from './Skeleton';

function FloatingInput({ label, name, type = 'text', value, onChange, error }: any) {
  return (
    <div className="relative pt-6">
      <input
        type={type}
        name={name}
        id={name}
        value={value}
        onChange={onChange}
        placeholder=" "
        className={clsx(
          "peer w-full bg-transparent border-b text-content pb-2 pt-2 focus:outline-none transition-colors placeholder-transparent",
          error ? "border-red-300 focus:border-red-500" : "border-[#c5a059]/40 focus:border-[#c5a059]"
        )}
      />
      <label 
        htmlFor={name}
        className={clsx(
          "absolute left-0 cursor-text transition-all tracking-wider uppercase text-sm",
          "peer-placeholder-shown:text-base peer-placeholder-shown:top-8",
          "peer-focus:top-2 peer-focus:text-xs",
          error ? "text-red-500 peer-focus:text-red-500" : "text-muted peer-focus:text-[#c5a059]",
          (!value && !error) ? "top-8 text-base" : "top-2 text-xs"
        )}
      >
        {label}
      </label>
    </div>
  );
}

export function AuthPage() {
  const location = useLocation();
  const [mode, setMode] = useState<'signin' | 'signup'>(location.state?.mode === 'signup' ? 'signup' : 'signin');
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const { user, profile, signIn, signUp, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const from = location.state?.from || '/my-orders';

  useEffect(() => {
    document.title = "Sign In — Grainood";
  }, []);

  useEffect(() => {
    if (!authLoading && user && profile) {
      if (!profile.profileCompleted) {
        navigate('/profile/setup', { replace: true });
      } else {
        navigate(location.state?.from || '/my-orders', { replace: true });
      }
    }
  }, [user, profile, authLoading, navigate, location]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setErrorMsg('');
  };

  const getErrorMessage = (error: any) => {
    switch (error?.code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return "Email or password is incorrect";
      case 'auth/email-already-in-use':
        return "That email already has an account. Please switch to Sign In.";
      case 'auth/weak-password':
        return "Use at least 6 characters";
      case 'auth/network-request-failed':
        return "Network error. Please try again (check your connection or ad-blockers).";
      default:
        console.error(error);
        return error?.message || "An error occurred. Please try again.";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      if (mode === 'signin') {
        await signIn({ email: formData.email, password: formData.password });
      } else {
        await signUp({ 
          fullName: formData.fullName, 
          phone: formData.phone, 
          email: formData.email, 
          password: formData.password 
        });
      }
      // redirect happens in useEffect
    } catch (err: any) {
      setErrorMsg(getErrorMessage(err));
      if (err?.code === 'auth/email-already-in-use') {
        setMode('signin');
      }
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="pt-32 pb-24 px-6 min-h-[70vh] flex justify-center items-center">
        <Skeleton variant="rectangular" className="w-full max-w-md h-96" />
      </div>
    );
  }

  return (
    <div className="pt-32 pb-24 px-6 min-h-screen bg-bg flex flex-col items-center justify-center">
      <div className="w-full max-w-md bg-surface p-8 md:p-12 shadow-sm border border-[#c5a059]/10 relative z-raised">
        <div className="flex justify-center mb-8 gap-8 border-b border-line pb-2">
          <button
            type="button"
            className={clsx(
              "uppercase tracking-[0.2em] text-xs font-bold transition-colors pb-2 relative",
              mode === 'signin' ? "text-[#c5a059]" : "text-muted hover:text-content/80"
            )}
            onClick={() => { setMode('signin'); setErrorMsg(''); }}
          >
            Sign In
            {mode === 'signin' && (
              <span className="absolute bottom-[-9px] left-0 right-0 h-0.5 bg-[#c5a059]"></span>
            )}
          </button>
          <button
            type="button"
            className={clsx(
              "uppercase tracking-[0.2em] text-xs font-bold transition-colors pb-2 relative",
              mode === 'signup' ? "text-[#c5a059]" : "text-muted hover:text-content/80"
            )}
            onClick={() => { setMode('signup'); setErrorMsg(''); }}
          >
            Create Account
            {mode === 'signup' && (
              <span className="absolute bottom-[-9px] left-0 right-0 h-0.5 bg-[#c5a059]"></span>
            )}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {mode === 'signup' && (
            <>
              <FloatingInput 
                label="Full Name" 
                name="fullName" 
                value={formData.fullName} 
                onChange={handleChange} 
              />
              <FloatingInput 
                label="Phone" 
                name="phone" 
                type="tel"
                value={formData.phone} 
                onChange={handleChange} 
              />
            </>
          )}
          
          <FloatingInput 
            label="Email Address" 
            name="email" 
            type="email"
            value={formData.email} 
            onChange={handleChange} 
          />
          <FloatingInput 
            label="Password" 
            name="password" 
            type="password"
            value={formData.password} 
            onChange={handleChange} 
          />

          {errorMsg && (
            <div className="text-red-500 tracking-wider uppercase text-[10px] mt-2">
              {errorMsg}
            </div>
          )}

          <div className="pt-4">
            <GoldButton 
              type="submit" 
              variant="solid" 
              className="w-full" 
              disabled={loading}
            >
              {loading ? 'Processing...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
            </GoldButton>
          </div>
        </form>
      </div>
    </div>
  );
}
