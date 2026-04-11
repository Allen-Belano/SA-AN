import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  clearSession,
  fetchCurrentUser,
  getApiErrorMessage,
  getSavedRoutes,
  getStoredSession,
  getNotifications,
  storeSession,
  updateCurrentUser,
} from '../api';
import MemojiAvatar from '../components/MemojiAvatar';
import { defaultMemoji, memojiPresets, memojiStyleOptions, normalizeMemoji } from '../components/memojiConfig';

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
  avatar_memoji: defaultMemoji,
  is_new_user: false,
  reputation_points: 0,
};

const Profile = ({ theme = 'light', onToggleTheme = () => {} }) => {
  const navigate = useNavigate();
  const [activeItem, setActiveItem] = useState(setupItems[0].id);
  const [session, setSession] = useState(() => getStoredSession());
  const [profile, setProfile] = useState(defaultProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [savedRoutes, setSavedRoutes] = useState([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

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
          avatar_memoji: response.user?.avatar_memoji || defaultMemoji,
        });
        setSession((current) => {
          const nextSession = { ...current, user: response.user };
          storeSession(nextSession);
          return nextSession;
        });

        if (session?.token === 'local-dev-session') {
          setLoading(false);
          return;
        }

        const [bookmarksResult, notificationsResult] = await Promise.all([
          getSavedRoutes(session.user.user_id),
          getNotifications(session.user.user_id, true),
        ]);

        setSavedRoutes(bookmarksResult.bookmarks || []);
        setUnreadNotificationCount((notificationsResult.notifications || []).length);
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
        avatar_memoji: response.user?.avatar_memoji || current.avatar_memoji || defaultMemoji,
        is_new_user: false,
      }));

      const nextSession = {
        ...session,
        user: {
          ...response.user,
          is_new_user: false,
        },
      };
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

  const memoji = normalizeMemoji(profile.avatar_memoji);

  const handleMemojiChange = (field, value) => {
    setProfile((current) => ({
      ...current,
      avatar_memoji: {
        ...normalizeMemoji(current.avatar_memoji),
        [field]: value,
      },
    }));
  };

  const handleMemojiPreset = (presetConfig) => {
    setProfile((current) => ({
      ...current,
      avatar_memoji: normalizeMemoji(presetConfig),
    }));
  };

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
        <div className="profile-avatar" aria-hidden="true" style={{ background: 'linear-gradient(145deg, #f0932b, #dd7c17)' }}>
          {profile.avatar_memoji ? (
            <MemojiAvatar config={profile.avatar_memoji} size={76} className="profile-memoji-avatar" />
          ) : (
            <span>{profileInitials || 'SA'}</span>
          )}
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

      {session?.user?.is_new_user && (
        <div className="card card-soft glass-card" style={{ border: '1px solid rgba(78, 164, 201, 0.45)' }}>
          <strong style={{ display: 'block', marginBottom: '0.35rem' }}>Welcome! Set up your memoji first.</strong>
          <p style={{ margin: 0, fontSize: '0.82rem' }}>
            You are in local signup mode. Customize your Memoji Style below, then tap Save Profile.
          </p>
        </div>
      )}

      <div className="card card-soft profile-actions">
        <div className="profile-signed-in" role="status" aria-live="polite">
          Signed in as {profile.name || session?.user?.name || 'Commuter'}
        </div>
        <div className="profile-action-row">
          <button type="button" className="btn btn-secondary profile-action-btn" onClick={handleSave}>
            {saving ? 'Saving...' : 'Quick Save'}
          </button>
          <button
            type="button"
            className="btn profile-action-btn profile-logout-btn"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
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

            <div className="card card-soft memoji-editor-card">
              <div className="memoji-editor-header">
                <strong>Memoji Style</strong>
                <MemojiAvatar config={memoji} size={62} className="memoji-editor-preview" />
              </div>

              <div className="memoji-preset-row">
                {memojiPresets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className="memoji-preset-btn"
                    onClick={() => handleMemojiPreset(preset.config)}
                  >
                    <MemojiAvatar config={preset.config} size={38} />
                    <span>{preset.label}</span>
                  </button>
                ))}
              </div>

              <div className="memoji-control-grid">
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label>Hair Style</label>
                  <select value={memoji.hairStyle} onChange={(event) => handleMemojiChange('hairStyle', event.target.value)}>
                    {memojiStyleOptions.hairStyle.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label>Eye Style</label>
                  <select value={memoji.eyeStyle} onChange={(event) => handleMemojiChange('eyeStyle', event.target.value)}>
                    {memojiStyleOptions.eyeStyle.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label>Mouth Style</label>
                  <select value={memoji.mouthStyle} onChange={(event) => handleMemojiChange('mouthStyle', event.target.value)}>
                    {memojiStyleOptions.mouthStyle.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label>Accessory</label>
                  <select value={memoji.accessory} onChange={(event) => handleMemojiChange('accessory', event.target.value)}>
                    {memojiStyleOptions.accessory.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="memoji-palette-grid">
                <div>
                  <span className="memoji-palette-label">Skin</span>
                  <div className="memoji-chip-row">
                    {memojiStyleOptions.skinTone.map((color) => (
                      <button
                        key={`skin-${color}`}
                        type="button"
                        className={`memoji-color-chip ${memoji.skinTone === color ? 'active' : ''}`}
                        style={{ background: color }}
                        onClick={() => handleMemojiChange('skinTone', color)}
                        aria-label={`Choose skin tone ${color}`}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <span className="memoji-palette-label">Hair</span>
                  <div className="memoji-chip-row">
                    {memojiStyleOptions.hairColor.map((color) => (
                      <button
                        key={`hair-${color}`}
                        type="button"
                        className={`memoji-color-chip ${memoji.hairColor === color ? 'active' : ''}`}
                        style={{ background: color }}
                        onClick={() => handleMemojiChange('hairColor', color)}
                        aria-label={`Choose hair color ${color}`}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <span className="memoji-palette-label">Eyes</span>
                  <div className="memoji-chip-row">
                    {memojiStyleOptions.eyeColor.map((color) => (
                      <button
                        key={`eye-${color}`}
                        type="button"
                        className={`memoji-color-chip ${memoji.eyeColor === color ? 'active' : ''}`}
                        style={{ background: color }}
                        onClick={() => handleMemojiChange('eyeColor', color)}
                        aria-label={`Choose eye color ${color}`}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <span className="memoji-palette-label">Background</span>
                  <div className="memoji-chip-row">
                    {memojiStyleOptions.bgColor.map((color) => (
                      <button
                        key={`bg-${color}`}
                        type="button"
                        className={`memoji-color-chip ${memoji.bgColor === color ? 'active' : ''}`}
                        style={{ background: color }}
                        onClick={() => handleMemojiChange('bgColor', color)}
                        aria-label={`Choose background color ${color}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="card card-soft" style={{ marginBottom: '0.9rem' }}>
              <strong style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.86rem' }}>Notification Preferences</strong>
              <label style={{ display: 'inline-flex', gap: '0.45rem', alignItems: 'center', marginBottom: '0.45rem' }}>
                <input
                  type="checkbox"
                  checked={profile.notify_disruptions !== false}
                  onChange={(event) => setProfile((current) => ({ ...current, notify_disruptions: event.target.checked }))}
                  style={{ width: 'auto' }}
                />
                Disruption alerts
              </label>
              <label style={{ display: 'inline-flex', gap: '0.45rem', alignItems: 'center', marginBottom: '0.45rem' }}>
                <input
                  type="checkbox"
                  checked={profile.notify_safety !== false}
                  onChange={(event) => setProfile((current) => ({ ...current, notify_safety: event.target.checked }))}
                  style={{ width: 'auto' }}
                />
                Safety reminders
              </label>
              <label style={{ display: 'inline-flex', gap: '0.45rem', alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={profile.notify_saved_routes !== false}
                  onChange={(event) => setProfile((current) => ({ ...current, notify_saved_routes: event.target.checked }))}
                  style={{ width: 'auto' }}
                />
                Saved route updates
              </label>
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

      <div className="card card-soft glass-card">
        <div className="row-between" style={{ marginBottom: '0.55rem' }}>
          <h2 style={{ marginBottom: 0 }}>Saved Routes</h2>
          <span className="pill">{savedRoutes.length} routes</span>
        </div>

        {savedRoutes.length === 0 ? (
          <p style={{ margin: 0, fontSize: '0.82rem' }}>No saved routes yet. Save routes from search or guide page.</p>
        ) : (
          savedRoutes.slice(0, 5).map((item) => (
            <button
              key={item.route_id}
              type="button"
              className="menu-item"
              style={{ textAlign: 'left' }}
              onClick={() => navigate(`/route/${item.route_id}`)}
            >
              <div>
                <strong>{item.start_location} to {item.destination}</strong>
                <p>Trust {item.trust_score} • Votes {item.vote_score}</p>
              </div>
            </button>
          ))
        )}
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
            <p>
              {session?.token
                ? `Your account has ${unreadNotificationCount} unread notifications.`
                : 'Sign in to persist your profile and keep saved routes synced.'}
            </p>
          </div>
          <div className="setup-block">
            <span className="setup-label">Appearance</span>
            <strong>Theme: {theme === 'dark' ? 'Dark mode' : 'Light mode'}</strong>
            <p>Switch app theme for better comfort in day or night commuting.</p>
            <button
              type="button"
              className={`profile-theme-toggle ${theme === 'dark' ? 'is-dark' : 'is-light'}`}
              onClick={onToggleTheme}
              role="switch"
              aria-checked={theme === 'dark'}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              <span className="profile-theme-track" aria-hidden="true">
                <span className="profile-theme-knob">
                  <span className="theme-icon theme-icon-sun">☀</span>
                  <span className="theme-icon theme-icon-moon">☾</span>
                </span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;