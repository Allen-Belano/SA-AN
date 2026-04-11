import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getNotifications, getRouteRecommendations, getStoredSession, getTransportNews } from '../api';

const commuterTips = [
  {
    id: 1,
    icon: '🛡️',
    title: 'Stay alert in crowded terminals',
    description: 'Keep your bag in front and use well-lit pickup points.',
    meta: 'Best for rush hour commutes',
  },
  {
    id: 2,
    icon: '📞',
    title: 'Report emergencies immediately',
    description: 'If something feels wrong, call 911 and move near station staff.',
    meta: 'Emergency hotline: 911',
  },
  {
    id: 3,
    icon: '🗺️',
    title: 'Confirm the route before boarding',
    description: 'Ask the driver or conductor for the stop sequence before riding.',
    meta: 'Avoid missed transfers',
  },
];

const travelModes = [
  { id: 'jeepney', label: 'Jeepney', emoji: '🚐' },
  { id: 'train', label: 'Train', emoji: '🚆' },
  { id: 'bus', label: 'Bus', emoji: '🚌' },
  { id: 'uv', label: 'UV', emoji: '🚖' },
];

const schedules = [
  { id: 1, carrier: 'MRT-3 Northbound', route: 'TFT', to: 'QAV', time: '35 min', date: 'Peak hour' },
  { id: 2, carrier: 'EDSA Carousel', route: 'AYL', to: 'SMN', time: '42 min', date: 'Community picked' },
];

const recommendations = [
  { id: 1, title: 'Safer Night Routes', subtitle: 'Well-lit transfer points' },
  { id: 2, title: 'Low Fare Picks', subtitle: 'Budget-first route combos' },
  { id: 3, title: 'Fast Transfer Plans', subtitle: 'Less waiting, less walking' },
];

const getNewsBadgeLabel = (category) => {
  const normalized = (category || '').toLowerCase();

  if (normalized === 'fare') {
    return 'Fare';
  }

  if (normalized === 'strike') {
    return 'Strike';
  }

  if (normalized === 'service') {
    return 'Service';
  }

  return 'Advisory';
};

const sanitizeNewsText = (value) => {
  if (!value) {
    return '';
  }

  return String(value)
    .replace(/<!\[CDATA\[(.*?)\]\]>/gis, '$1')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&#x27;/gi, "'")
    .replace(/<[^>]*>/g, ' ')
    .replace(/https?:\/\/\S+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const formatNewsDate = (publishedAt, createdAt) => {
  const dateValue = publishedAt || createdAt;
  if (!dateValue) {
    return null;
  }

  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const Home = () => {
  const [start, setStart] = useState('');
  const [destination, setDestination] = useState('');
  const [activeMode, setActiveMode] = useState(travelModes[0].id);
  const [activeTipIndex, setActiveTipIndex] = useState(0);
  const [dynamicRecommendations, setDynamicRecommendations] = useState([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const [transportNews, setTransportNews] = useState([]);
  const [transportNewsError, setTransportNewsError] = useState('');
  const navigate = useNavigate();

  const session = getStoredSession();

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setActiveTipIndex((current) => (current + 1) % commuterTips.length);
    }, 4500);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const loadPersonalization = async () => {
      if (!session?.user?.user_id) {
        return;
      }

      try {
        const [recommendationsResult, notificationsResult] = await Promise.all([
          getRouteRecommendations(session.user.user_id),
          getNotifications(session.user.user_id, true),
        ]);

        setDynamicRecommendations(recommendationsResult.recommendations || []);
        setNotificationCount((notificationsResult.notifications || []).length);
      } catch {
        // Keep fallback content when personalization APIs fail.
      }
    };

    loadPersonalization();
  }, [session?.user?.user_id]);

  useEffect(() => {
    let mounted = true;

    const loadTransportNews = async () => {
      try {
        const result = await getTransportNews({ limit: 6, active: true });
        if (!mounted) {
          return;
        }

        setTransportNews(result.updates || []);
        setTransportNewsError('');
      } catch {
        if (!mounted) {
          return;
        }

        setTransportNewsError('Live transit advisories are temporarily unavailable.');
      }
    };

    loadTransportNews();
    const refreshId = window.setInterval(loadTransportNews, 180000);

    return () => {
      mounted = false;
      window.clearInterval(refreshId);
    };
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (start && destination) {
      navigate(`/search?start=${start}&destination=${destination}`);
    }
  };

  const activeTip = commuterTips[activeTipIndex];
  const selectedMode = travelModes.find((mode) => mode.id === activeMode) || travelModes[0];

  return (
    <div className="screen-stack home-screen">
      <div className="dashboard-top">
        <span className="points-pill">320 points</span>
        <div className="quick-actions" aria-label="Quick actions">
          <button type="button" className="round-icon" aria-label="Search">⌕</button>
          <button type="button" className="round-icon" aria-label="Notifications" title={`${notificationCount} unread notifications`}>
            {notificationCount > 0 ? notificationCount : '◌'}
          </button>
        </div>
      </div>

      <div className="section-header" style={{ marginTop: 0 }}>
        <h1>SA/AN Travel Made Effortless</h1>
        <p>Community-powered commuter navigation for daily biyahe.</p>
      </div>

      <div className="transport-tabs">
        {travelModes.map((mode) => (
          <button
            key={mode.id}
            type="button"
            className={`transport-tab ${activeMode === mode.id ? 'active' : ''}`}
            onClick={() => setActiveMode(mode.id)}
            aria-pressed={activeMode === mode.id}
            aria-label={`Filter by ${mode.label}`}
          >
            <span className="mode-emoji" aria-hidden="true">{mode.emoji}</span>
            <span>{mode.label}</span>
          </button>
        ))}
      </div>

      <p className="transport-tab-status" aria-live="polite">
        Showing {selectedMode.label} routes near you
      </p>

      <div className="card card-soft trip-finder-card">
        <div className="row-between" style={{ marginBottom: '0.65rem' }}>
          <h2 style={{ margin: 0 }}>Find Your Best Route</h2>
          <span className="finder-illustration" aria-hidden="true">🚄</span>
        </div>

        <div className="finder-tabs" aria-label="Trip type options">
          <button type="button" className="finder-tab active">One Way</button>
          <button type="button" className="finder-tab">Round Trip</button>
        </div>

        <form onSubmit={handleSearch} className="finder-form">
          <div className="input-group">
            <label>From</label>
            <input
              type="text"
              placeholder="e.g. EDSA Taft"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <label>To</label>
            <input
              type="text"
              placeholder="e.g. SM North EDSA"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-jet">
            Search
          </button>
        </form>
      </div>

      <div className="card card-soft">
        <div className="row-between" style={{ marginBottom: '0.75rem' }}>
          <h2 style={{ margin: 0 }}>Popular Route Schedules</h2>
          <span className="link-pill">View all</span>
        </div>

        <div className="ticket-list">
          {schedules.map((item) => (
            <div
              key={item.id}
              className="ticket-row"
              onClick={() => navigate(`/route/${item.id}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  navigate(`/route/${item.id}`);
                }
              }}
            >
              <div className="ticket-main">
                <strong>{item.carrier}</strong>
                <span>{item.date}</span>
              </div>
              <div className="ticket-route">
                <strong>{item.route}</strong>
                <span>→</span>
                <strong>{item.to}</strong>
              </div>
              <span className="ticket-time">{item.time}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card card-soft glass-card safety-carousel-card">
        <div className="row-between" style={{ marginBottom: '0.8rem' }}>
          <h2 style={{ marginBottom: 0 }}>Safety Tips</h2>
          <span className="pill">{activeTipIndex + 1} / {commuterTips.length}</span>
        </div>
        <div className="carousel-panel" role="region" aria-label="Commuter safety tips carousel">
          <div className="carousel-icon" aria-hidden="true">{activeTip.icon}</div>
          <div className="stack-sm">
            <strong className="carousel-title">{activeTip.title}</strong>
            <p className="carousel-description">{activeTip.description}</p>
            <span className="carousel-meta">{activeTip.meta}</span>
          </div>
        </div>

        <div className="carousel-dots" aria-label="Choose a tip">
          {commuterTips.map((tip, index) => (
            <button
              key={tip.id}
              type="button"
              className={`carousel-dot ${index === activeTipIndex ? 'active' : ''}`}
              onClick={() => setActiveTipIndex(index)}
              aria-label={`Show tip ${index + 1}`}
            />
          ))}
        </div>
      </div>

      <div className="card card-soft glass-card transit-news-card">
        <div className="row-between" style={{ marginBottom: '0.8rem' }}>
          <h2 style={{ marginBottom: 0 }}>Transit Alerts</h2>
          <span className="pill">Live updates</span>
        </div>

        {transportNewsError ? (
          <p style={{ margin: 0, fontSize: '0.82rem' }}>{transportNewsError}</p>
        ) : transportNews.length === 0 ? (
          <p style={{ margin: 0, fontSize: '0.82rem' }}>No active advisories right now.</p>
        ) : (
          <div className="transit-news-list">
            {transportNews.map((item) => (
              <article key={item.news_id} className="transit-news-item">
                {(() => {
                  const cleanedTitle = sanitizeNewsText(item.title);
                  const cleanedDetails = sanitizeNewsText(item.details);
                  const reportDate = formatNewsDate(item.published_at, item.created_at);
                  const showDetails = cleanedDetails && cleanedDetails !== cleanedTitle;

                  return (
                    <>
                      <div className="transit-news-meta-row">
                        <span className={`transit-news-badge category-${(item.category || 'advisory').toLowerCase()}`}>
                          {getNewsBadgeLabel(item.category)}
                        </span>
                        <span className="transit-news-source">{item.source_label || 'Transit Bulletin'}</span>
                      </div>
                      {reportDate && <time className="transit-news-date">{reportDate}</time>}
                      <strong>{cleanedTitle || 'Transit advisory'}</strong>
                      {showDetails && <p>{cleanedDetails}</p>}
                      {item.source_url && (
                        <a
                          href={item.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="transit-news-link"
                        >
                          Read source
                        </a>
                      )}
                    </>
                  );
                })()}
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="inline-grid">
        <div className="row-between" style={{ marginBottom: '-0.2rem' }}>
          <h2>Recommendations</h2>
          <span className="link-pill">View all</span>
        </div>
        <div className="recommend-grid">
          {(dynamicRecommendations.length > 0 ? dynamicRecommendations : recommendations).map((item) => (
            <article key={item.id || item.route_id} className="recommend-card">
              <div className="recommend-visual" aria-hidden="true"></div>
              <div className="recommend-copy">
                <strong>{item.title || `${item.start_location} to ${item.destination}`}</strong>
                <span>{item.subtitle || item.recommendation_reason || 'Community recommended route'}</span>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="inline-grid">
        <h2>Recent Community Routes</h2>
        <div className="card card-soft glass-card" onClick={() => navigate('/route/1')} style={{ cursor: 'pointer' }}>
          <div className="row-between" style={{ marginBottom: '0.65rem' }}>
            <strong className="route-title">EDSA Taft → SM North EDSA</strong>
            <span className="vote-badge">124 votes</span>
          </div>
          <p style={{ margin: 0, fontSize: '0.84rem' }}>Via MRT-3 • 35 mins • ₱28.00</p>
        </div>
        <div className="card card-soft" onClick={() => navigate('/route/2')} style={{ cursor: 'pointer' }}>
          <div className="row-between" style={{ marginBottom: '0.65rem' }}>
            <strong className="route-title">Ayala Triangle → BGC High Street</strong>
            <span className="vote-badge">89 votes</span>
          </div>
          <p style={{ margin: 0, fontSize: '0.84rem' }}>Via BGC Bus • 20 mins • ₱13.00</p>
        </div>
      </div>
    </div>
  );
};

export default Home;
