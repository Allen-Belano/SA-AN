import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApiErrorMessage, getStoredSession, loginUser, registerUser, storeSession } from '../api';

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
      const payload = mode === 'login'
        ? { email: form.email, password: form.password }
        : { name: form.name.trim(), email: form.email, password: form.password };

      const response = mode === 'login'
        ? await loginUser(payload)
        : await registerUser(payload);

      storeSession(response);
      navigate('/');
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Unable to continue. Check backend connection and try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="screen-stack">
      <div className="section-header" style={{ marginTop: 0 }}>
        <h1>Create an Account</h1>
        <p>Sign up or log in to continue to your commuter dashboard.</p>
      </div>

      <div className="card card-soft auth-card">
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
            Create Account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'signup' && (
            <div className="input-group">
              <label>Display Name</label>
              <input
                name="name"
                type="text"
                placeholder="e.g. Metro Guide Mia"
                value={form.name}
                onChange={handleChange}
                required={mode === 'signup'}
              />
            </div>
          )}

          <div className="input-group">
            <label>Email</label>
            <input
              name="email"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="input-group">
            <label>Password</label>
            <input
              name="password"
              type="password"
              placeholder="Enter your password"
              value={form.password}
              onChange={handleChange}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary">
            {submitting ? 'Please wait...' : mode === 'login' ? 'Enter App' : 'Create Account and Enter'}
          </button>
        </form>

        {errorMessage && <p className="form-message error-message">{errorMessage}</p>}

        <div className="auth-divider">
          <span>Quick options</span>
        </div>

        <div className="social-grid">
          <button type="button" className="social-btn">
            <span className="social-icon google-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M21.805 12.023c0-.79-.069-1.533-.198-2.25H12v4.256h5.498a4.704 4.704 0 0 1-2.039 3.087v2.565h3.304c1.934-1.781 3.042-4.409 3.042-7.658Z" fill="#4285F4" />
                <path d="M12 22c2.754 0 5.063-.913 6.75-2.319l-3.304-2.565c-.913.612-2.083.98-3.446.98-2.658 0-4.909-1.793-5.713-4.204H2.87v2.646A9.997 9.997 0 0 0 12 22Z" fill="#34A853" />
                <path d="M6.287 13.892A5.998 5.998 0 0 1 5.968 12c0-.657.114-1.296.319-1.892V7.462H2.87A9.997 9.997 0 0 0 2 12c0 1.614.387 3.142 1.07 4.538l3.217-2.646Z" fill="#FBBC05" />
                <path d="M12 5.904c1.497 0 2.841.516 3.9 1.53l2.924-2.924C17.058 2.87 14.75 2 12 2a9.997 9.997 0 0 0-9.13 5.462l3.417 2.646C7.09 7.697 9.341 5.904 12 5.904Z" fill="#EA4335" />
              </svg>
            </span>
            <span>Google</span>
          </button>
          <button type="button" className="social-btn">
            <span className="social-icon facebook-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073c0 6.026 4.388 11.021 10.125 11.927v-8.437H7.078v-3.49h3.047V9.41c0-3.03 1.792-4.704 4.533-4.704 1.313 0 2.686.236 2.686.236v2.975h-1.514c-1.492 0-1.956.931-1.956 1.887v2.269h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.099 24 12.073Z" fill="#1877F2" />
                <path d="M16.671 15.563l.532-3.49h-3.328V9.804c0-.956.464-1.887 1.956-1.887h1.514V4.942s-1.373-.236-2.686-.236c-2.74 0-4.533 1.674-4.533 4.704v2.663H7.078v3.49h3.047V24a12.15 12.15 0 0 0 3.75 0v-8.437h2.796Z" fill="#fff" />
              </svg>
            </span>
            <span>Facebook</span>
          </button>
        </div>

        <p className="muted-text auth-footnote">
          By continuing, you can manage saved routes, account settings, and commuter setup details.
        </p>
      </div>
    </div>
  );
};

export default Login;