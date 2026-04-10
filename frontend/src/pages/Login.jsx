import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStoredSession, storeSession } from '../api';

const Login = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
  });

  useEffect(() => {
    const existingSession = getStoredSession();
    if (existingSession?.token) {
      navigate('/');
    }
  }, [navigate]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage('');

    try {
      const normalizedEmail = (form.email || '').trim() || `guest${Date.now()}@local`;
      const normalizedName = mode === 'signup'
        ? (form.name || '').trim() || 'New Commuter'
        : 'Commuter';

      const localSession = {
        token: 'local-dev-session',
        user: {
          user_id: Date.now(),
          name: normalizedName,
          email: normalizedEmail,
          avatar_color: '#f0932b',
          avatar_memoji: null,
          is_new_user: mode === 'signup',
        },
      };

      storeSession(localSession);
      navigate(mode === 'signup' ? '/profile' : '/');
    } catch {
      setErrorMessage('Unable to continue in local auth mode. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="signin-shell">
      <div className="signin-hero" aria-hidden="true">
        <span className="signin-dot dot-a"></span>
        <span className="signin-dot dot-b"></span>
        <span className="signin-dot dot-c"></span>
        <span className="signin-dot dot-d"></span>
        <div className="signin-avatars">
          <img src="/avatar-1.svg" alt="Avatar 1" className="avatar-bubble avatar-a" />
          <img src="/avatar-2.svg" alt="Avatar 2" className="avatar-bubble avatar-b" />
          <img src="/avatar-3.svg" alt="Avatar 3" className="avatar-bubble avatar-c" />
          <span className="avatar-tag">SA/AN</span>
        </div>
        <h1>Let's get you signed in!</h1>
        <p>Commuter routes, profile, and smart guidance in one place.</p>
      </div>

      <div className="signin-panel">
        <p className="signin-caption">
          {mode === 'login' ? "You don't have an account yet?" : 'Already have an account?'}
        </p>

        <div className="auth-toggle">
          <button
            type="button"
            className={`tab-btn ${mode === 'login' ? 'active' : ''}`}
            onClick={() => setMode('login')}
          >
            Login
          </button>
          <button
            type="button"
            className={`tab-btn ${mode === 'signup' ? 'active' : ''}`}
            onClick={() => setMode('signup')}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form signin-form">
          {mode === 'signup' && (
            <div className="input-group">
              <input
                name="name"
                type="text"
                placeholder="Display name"
                value={form.name}
                onChange={handleChange}
              />
            </div>
          )}

          <div className="input-group">
            <input
              name="email"
              type="email"
              placeholder="Email address"
              value={form.email}
              onChange={handleChange}
            />
          </div>

          <div className="input-group">
            <input
              name="password"
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={handleChange}
            />
          </div>

          <button type="button" className="forgot-btn">
            Forgot password?
          </button>

          <button type="submit" className="btn signin-submit-btn">
            {submitting ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {errorMessage && <p className="form-message error-message">{errorMessage}</p>}
      </div>
    </div>
  );
};

export default Login;