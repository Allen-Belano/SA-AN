import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  clearSession,
  fetchCurrentUser,
  getApiErrorMessage,
  getStoredSession,
  storeSession,
  updateCurrentUser,
} from '../api';

const setupItems = [
  {
    id: 1,
    title: 'Personal details',
    description: 'Add display name, age group, and emergency contact.',
    badge: '40%'
  },
  {
    id: 2,
    title: 'Commute preferences',
    description: 'Choose preferred transport, budget, and travel windows.',
    badge: 'Set'
  },
  {
    id: 3,
    title: 'Saved routes',
    description: 'Pin common trips for one-tap route access.',
    badge: '3 routes'
  },
  {
    id: 4,
    title: 'Alerts and safety',
    description: 'Turn on disruption alerts and safe trip reminders.',
    badge: 'Off'
  },
];

const defaultProfile = {
  name: '',
  email: '',
  bio: '',
  home_location: '',
  preferred_transport: '',
  budget_level: '',
  travel_window: '',
  emergency_contact: '',
  avatar_color: '#f0932b',
  reputation_points: 0,
};

const colorOptions = ['#f0932b', '#40b285', '#e57f84', '#7a9ef8'];

const Profile = () => {
  const navigate = useNavigate();
  const [activeItem, setActiveItem] = useState(setupItems[0].id);
  const [session, setSession] = useState(() => getStoredSession());
  const [profile, setProfile] = useState(defaultProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!session?.token) {
      navigate('/login');
      return;
    }

    const loadProfile = async () => {
      try {
        const response = await fetchCurrentUser(session.token);
        setProfile({
          ...defaultProfile,
          ...response.user,
        });
        setSession((current) => {
          const nextSession = { ...current, user: response.user };
          storeSession(nextSession);
          return nextSession;
        });
      } catch (error) {
        setErrorMessage(getApiErrorMessage(error, 'Unable to load your profile right now.'));
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [navigate, session?.token]);

  const profileStrength = useMemo(() => {
    const fields = [
      profile.name,
      profile.bio,
      profile.home_location,
      profile.preferred_transport,
      profile.budget_level,
      profile.travel_window,
      profile.emergency_contact,
    ];
    const completedFields = fields.filter(Boolean).length;
    return Math.round((completedFields / fields.length) * 100);
  }, [profile]);

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    setProfile((current) => ({
      ...current,
      [name]: value,
    }));
    setStatusMessage('');
  };

  const handleSave = async (event) => {
    event.preventDefault();

    if (!session?.token) {
      navigate('/login');
      return;
    }

    setSaving(true);
    setErrorMessage('');
    setStatusMessage('');

    try {
      const response = await updateCurrentUser(session.token, profile);
      setProfile((current) => ({
        ...current,
        ...response.user,
      }));

      const nextSession = { ...session, user: response.user };
      storeSession(nextSession);
      setSession(nextSession);
      setStatusMessage('Profile saved successfully.');
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Unable to save your changes.'));
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    clearSession();
    setSession(null);
    setProfile(defaultProfile);
    navigate('/login');
  };

  const profileInitials = (profile.name || session?.user?.name || 'SA')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return (
    <div className="screen-stack">
      <div className="row-between">
        <div className="section-header" style={{ marginTop: 0 }}>
          <h1>Profile Menu</h1>
          <p>Set up your account, preferences, and saved commuter tools.</p>
        </div>
        <button className="btn-icon" onClick={handleLogout} aria-label="Logout">
          ⎋
        </button>
      </div>

      <div className="card card-soft glass-card profile-hero">
        <div className="profile-avatar" aria-hidden="true" style={{ background: `linear-gradient(145deg, ${profile.avatar_color}, #dd7c17)` }}>
          <span>{profileInitials || 'SA'}</span>
        </div>
        <div className="profile-copy">
          <span className="hero-chip">Account Setup</span>
          <h2 style={{ marginBottom: '0.35rem' }}>Ready for a smarter commute</h2>
          <p style={{ marginBottom: '0.7rem' }}>
            Complete your profile to save routes, personalize results, and receive timely travel alerts.
          </p>
          <div className="mini-stats">
            <span className="pill">Profile strength {profileStrength}%</span>
            <span className="pill">Rep {profile.reputation_points}</span>
          </div>
        </div>
      </div>

      <div className="card card-soft profile-actions">
        <button type="button" className="btn btn-primary">
          Signed in as {profile.name || session?.user?.name || 'Commuter'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={handleSave}>
          {saving ? 'Saving...' : 'Quick Save Profile'}
        </button>
      </div>

      {loading ? (
        <div className="card card-soft glass-card">
          <p style={{ marginBottom: 0 }}>Loading profile...</p>
        </div>
      ) : (
        <div className="card card-soft glass-card setup-panel">
          <div className="section-header" style={{ marginTop: 0 }}>
            <h2>Editable Profile</h2>
            <p>Update your commuter identity and travel preferences.</p>
          </div>

          <form onSubmit={handleSave} className="profile-form">
            <div className="input-group">
              <label>Display Name</label>
              <input name="name" value={profile.name} onChange={handleFieldChange} required />
            </div>

            <div className="input-group">
              <label>Email</label>
              <input value={profile.email} readOnly disabled />
            </div>

            <div className="input-group">
              <label>Bio</label>
              <textarea
                name="bio"
                rows="3"
                placeholder="Share your typical commute or route expertise"
                value={profile.bio}
                onChange={handleFieldChange}
              />
            </div>

            <div className="dual-grid">
              <div className="input-group">
                <label>Home Location</label>
                <input
                  name="home_location"
                  placeholder="e.g. Taft Avenue"
                  value={profile.home_location}
                  onChange={handleFieldChange}
                />
              </div>

              <div className="input-group">
                <label>Preferred Transport</label>
                <select
                  name="preferred_transport"
                  value={profile.preferred_transport}
                  onChange={handleFieldChange}
                >
                  <option value="">Choose one</option>
                  <option value="Jeepney">Jeepney</option>
                  <option value="Bus">Bus</option>
                  <option value="Train">Train</option>
                  <option value="UV Express">UV Express</option>
                  <option value="Mixed">Mixed</option>
                </select>
              </div>
            </div>

            <div className="dual-grid">
              <div className="input-group">
                <label>Budget Level</label>
                <select
                  name="budget_level"
                  value={profile.budget_level}
                  onChange={handleFieldChange}
                >
                  <option value="">Choose one</option>
                  <option value="Budget-first">Budget-first</option>
                  <option value="Balanced">Balanced</option>
                  <option value="Fastest">Fastest</option>
                </select>
              </div>

              <div className="input-group">
                <label>Travel Window</label>
                <input
                  name="travel_window"
                  placeholder="e.g. Weekdays 7-9 AM"
                  value={profile.travel_window}
                  onChange={handleFieldChange}
                />
              </div>
            </div>

            <div className="input-group">
              <label>Emergency Contact</label>
              <input
                name="emergency_contact"
                placeholder="Name and number"
                value={profile.emergency_contact}
                onChange={handleFieldChange}
              />
            </div>

            <div className="input-group">
              <label>Profile Accent</label>
              <div className="color-row">
                {colorOptions.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`color-dot ${profile.avatar_color === color ? 'active' : ''}`}
                    style={{ background: color }}
                    onClick={() => setProfile((current) => ({ ...current, avatar_color: color }))}
                    aria-label={`Choose ${color} accent`}
                  />
                ))}
              </div>
            </div>

            <button type="submit" className="btn btn-primary">
              {saving ? 'Saving...' : 'Save Profile'}
            </button>

            {statusMessage && <p className="form-message success-message">{statusMessage}</p>}
            {errorMessage && <p className="form-message error-message">{errorMessage}</p>}
          </form>
        </div>
      )}

      <div className="card card-soft">
        <div className="row-between" style={{ marginBottom: '0.8rem' }}>
          <h2 style={{ marginBottom: 0 }}>Setup Menu</h2>
          <span className="pill">4 sections</span>
        </div>

        <div className="profile-menu">
          {setupItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`menu-item ${activeItem === item.id ? 'active' : ''}`}
              onClick={() => setActiveItem(item.id)}
            >
              <div>
                <strong>{item.title}</strong>
                <p>{item.description}</p>
              </div>
              <span className="menu-badge">{item.badge}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="card card-soft glass-card setup-panel">
        <div className="section-header" style={{ marginTop: 0 }}>
          <h2>Focused Setup</h2>
          <p>
            {setupItems.find((item) => item.id === activeItem)?.description}
          </p>
        </div>

        <div className="setup-grid">
          <div className="setup-block">
            <span className="setup-label">Suggested next action</span>
            <strong>{activeItem === 1 ? 'Complete identity details' : activeItem === 2 ? 'Review commuter preferences' : activeItem === 3 ? 'Pin frequent trips' : 'Turn on safety options'}</strong>
            <p>{activeItem === 1 ? 'Add a clearer bio and emergency contact for a more complete account.' : activeItem === 2 ? 'Set budget-friendly routes and preferred transport modes for better suggestions.' : activeItem === 3 ? 'Save the routes you use daily so they stay one tap away.' : 'Use alerts to stay informed during disruptions and safer travel windows.'}</p>
          </div>
          <div className="setup-block">
            <span className="setup-label">Security</span>
            <strong>{session?.token ? 'Session active' : 'Login not connected'}</strong>
            <p>{session?.token ? 'Your current session can update profile data through the backend API.' : 'Sign in to persist your profile and keep saved routes synced.'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;