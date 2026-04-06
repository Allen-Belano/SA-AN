import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import RouteTrackerMap from '../components/RouteTrackerMap';
import {
  bookmarkRoute,
  getApiErrorMessage,
  getRouteById,
  getRouteLiveStatus,
  getStoredSession,
  reportRouteIssue,
  voteRoute,
} from '../api';

const DEFAULT_START_COORDS = [14.5995, 120.9842];
const DEFAULT_DESTINATION_COORDS = [14.6091, 121.0223];

const vehicleIconMap = {
  walk: '🚶',
  jeepney: '🛺',
  bus: '🚌',
  train: '🚆',
  tricycle: '🛵',
  'uv express': '🚐',
  default: '📍',
};

const getVehicleIcon = (vehicleType) => {
  if (!vehicleType) {
    return vehicleIconMap.default;
  }

  const normalized = vehicleType.toLowerCase();
  return vehicleIconMap[normalized] || vehicleIconMap.default;
};

const formatFareValue = (fare) => {
  if (fare === null || fare === undefined) {
    return null;
  }

  const numericFare = Number.parseFloat(fare);
  if (!Number.isFinite(numericFare)) {
    return null;
  }

  return `P${numericFare.toFixed(2)}`;
};

const formatStepFare = (step) => {
  const regularFare = formatFareValue(step.fare_regular);
  const discountFare = formatFareValue(step.fare_discount);

  if (!regularFare && !discountFare) {
    return null;
  }

  if (regularFare && discountFare) {
    return `${regularFare} (Regular) | ${discountFare} (Discounted)`;
  }

  return regularFare || discountFare;
};

const formatTotalFare = (steps) => {
  const total = steps.reduce((sum, step) => {
    const fare = Number.parseFloat(step.fare_regular);
    return Number.isFinite(fare) ? sum + fare : sum;
  }, 0);

  return total > 0 ? `P${total.toFixed(2)}` : 'Not specified';
};

const RouteGuide = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [routeData, setRouteData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeTab, setActiveTab] = useState('steps');
  const [liveStatus, setLiveStatus] = useState(null);
  const [actionMessage, setActionMessage] = useState('');

  const session = getStoredSession();
  const userId = session?.user?.user_id;

  useEffect(() => {
    const loadRoute = async () => {
      setLoading(true);
      setErrorMessage('');

      try {
        const response = await getRouteById(id, { user_id: userId });
        setRouteData(response);
      } catch (error) {
        setErrorMessage(getApiErrorMessage(error, 'Unable to load route details right now.'));
      } finally {
        setLoading(false);
      }
    };

    loadRoute();
  }, [id, userId]);

  useEffect(() => {
    let intervalId;

    const loadLiveStatus = async () => {
      try {
        const response = await getRouteLiveStatus(id);
        setLiveStatus(response);
      } catch {
        // Keep the view stable if live status fails temporarily.
      }
    };

    loadLiveStatus();
    intervalId = window.setInterval(loadLiveStatus, 20000);

    return () => window.clearInterval(intervalId);
  }, [id]);

  const refreshRoute = async () => {
    const response = await getRouteById(id, { user_id: userId });
    setRouteData(response);
  };

  const requireSession = () => {
    if (!userId) {
      navigate('/login');
      return false;
    }
    return true;
  };

  const handleVote = async () => {
    if (!requireSession()) {
      return;
    }

    try {
      const voteResult = await voteRoute(id, {
        user_id: userId,
        vote_type: 1,
      });

      setActionMessage(`Thanks for your feedback. Trust score is now ${voteResult.trust_score}.`);
      await refreshRoute();
    } catch (error) {
      setActionMessage(getApiErrorMessage(error, 'Unable to submit vote.'));
    }
  };

  const handleBookmark = async () => {
    if (!requireSession()) {
      return;
    }

    try {
      const response = await bookmarkRoute(id, {
        user_id: userId,
        action: routeData?.route?.is_saved ? 'remove' : 'save',
      });
      setActionMessage(response.saved ? 'Route saved to your trips.' : 'Route removed from saved trips.');
      await refreshRoute();
    } catch (error) {
      setActionMessage(getApiErrorMessage(error, 'Unable to update saved route.'));
    }
  };

  const handleReportIssue = async () => {
    if (!requireSession()) {
      return;
    }

    const reason = window.prompt('Report reason (e.g. wrong fare, unsafe step, outdated route):', 'outdated route');
    if (!reason) {
      return;
    }

    try {
      await reportRouteIssue(id, {
        user_id: userId,
        reason,
      });
      setActionMessage('Thank you. Route issue report submitted to reviewers.');
      await refreshRoute();
    } catch (error) {
      setActionMessage(getApiErrorMessage(error, 'Unable to submit report right now.'));
    }
  };

  if (loading) {
    return (
      <div className="screen-stack">
        <div className="row-between">
          <button className="btn-icon" onClick={() => navigate(-1)} aria-label="Go back">
            ←
          </button>
          <h1 style={{ margin: 0, flex: 1, marginLeft: '0.5rem', fontSize: '1.2rem' }}>Loading route...</h1>
        </div>
        <div className="card card-soft" style={{ textAlign: 'center', padding: '1.5rem' }}>
          Fetching route instructions...
        </div>
      </div>
    );
  }

  if (errorMessage || !routeData?.route) {
    return (
      <div className="screen-stack">
        <div className="row-between">
          <button className="btn-icon" onClick={() => navigate(-1)} aria-label="Go back">
            ←
          </button>
          <h1 style={{ margin: 0, flex: 1, marginLeft: '0.5rem', fontSize: '1.2rem' }}>Route unavailable</h1>
        </div>
        <div className="card card-soft" style={{ textAlign: 'center', padding: '1.5rem' }}>
          <p style={{ marginBottom: '0.85rem' }}>{errorMessage || 'Route not found.'}</p>
          <button className="btn" onClick={() => navigate('/search')}>Back to Search</button>
        </div>
      </div>
    );
  }

  const route = routeData.route;
  const steps = routeData.steps || [];
  const disruptions = routeData.disruptions || [];
  const routeTitle = `${route.start_location} to ${route.destination}`;
  const totalFare = formatTotalFare(steps);
  const votes = route.vote_score || 0;

  return (
    <div className="screen-stack">
      <div className="row-between">
        <button className="btn-icon" onClick={() => navigate(-1)} aria-label="Go back">
          ←
        </button>
        <h1 style={{ margin: 0, flex: 1, marginLeft: '0.5rem', fontSize: '1.2rem' }}>
          {routeTitle}
        </h1>
      </div>

      <div className="card route-summary">
        <div className="route-summary-map" aria-hidden="true">
          <span className="route-chip">{route.vehicle_type || 'Route'}</span>
          <span className="route-chip route-chip-light">Stop 08</span>
        </div>

        <div className="route-summary-card">
          <span className="route-kicker">Arrival Status</span>
          <div className="row-between" style={{ alignItems: 'flex-end' }}>
            <h2 style={{ margin: 0, fontSize: '1.42rem' }}>
              {liveStatus?.eta_minutes ? `Arriving in ${liveStatus.eta_minutes} mins` : 'Arriving soon'}
            </h2>
            <div className="summary-votes">
              <span style={{ display: 'block', fontSize: '1rem' }}>{votes}</span>
              <span style={{ fontSize: '0.69rem' }}>helpful</span>
            </div>
          </div>
          <p style={{ margin: '0.22rem 0 0.58rem' }}>
            Trust {route.trust_score || 0} • Fare {totalFare}
          </p>

          <div className="route-progress" role="presentation">
            <span></span>
          </div>

          <div className="row-between" style={{ marginTop: '0.5rem' }}>
            <span className="service-pill">{liveStatus?.status || 'Service status unavailable'}</span>
            <span className="muted-text" style={{ fontSize: '0.74rem' }}>
              {liveStatus?.progress_percent || 0}% complete
            </span>
          </div>
        </div>

        {disruptions.length > 0 && (
          <div className="card card-soft" style={{ marginTop: '0.65rem', marginBottom: 0, padding: '0.65rem 0.75rem' }}>
            <strong style={{ fontSize: '0.82rem' }}>Live disruptions</strong>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem' }}>
              {disruptions[0].title || disruptions[0].category}: {disruptions[0].message}
            </p>
          </div>
        )}

        <div className="tabs">
          <button 
            className={`tab-btn ${activeTab === 'steps' ? 'active' : ''}`}
            onClick={() => setActiveTab('steps')}
          >
            Steps
          </button>
          <button 
            className={`tab-btn ${activeTab === 'map' ? 'active' : ''}`}
            onClick={() => setActiveTab('map')}
          >
            Live Map
          </button>
        </div>
      </div>

      {activeTab === 'steps' ? (
        <div className="card card-soft">
          <h2 style={{ marginBottom: '1.5rem' }}>Route Instructions</h2>
          <div>
            {steps.map((step, index) => (
              <div className="step-item" key={step.step_id || `${step.step_order || 'step'}-${index}`}>
                <div className="step-icon">{getVehicleIcon(step.vehicle_type)}</div>
                <div className="step-content">
                  <p style={{ margin: '0 0 0.5rem', fontWeight: '500', color: 'var(--text-primary)' }}>
                    {step.instruction}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Type: <strong style={{ color: 'var(--primary-color)' }}>{step.vehicle_type || 'Not specified'}</strong>
                  </p>
                  {step.stop_location && (
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Landmark: {step.stop_location}
                    </p>
                  )}
                  {formatStepFare(step) && (
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--secondary-color)' }}>
                      Fare: {formatStepFare(step)}
                    </p>
                  )}

                  {step.photo_url && (
                    <img
                      src={step.photo_url}
                      alt="Step visual"
                      style={{ width: '100%', borderRadius: '12px', marginTop: '0.55rem', maxHeight: '180px', objectFit: 'cover' }}
                    />
                  )}

                  {step.video_url && (
                    <video
                      controls
                      src={step.video_url}
                      style={{ width: '100%', borderRadius: '12px', marginTop: '0.55rem', maxHeight: '220px', background: '#000' }}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '1.3rem', display: 'flex', gap: '0.7rem' }}>
            <button className="btn btn-secondary" style={{ flex: 1, padding: '0.75rem' }} onClick={handleVote}>
              👍 Upvote
            </button>
            <button className="btn" style={{ flex: 1, background: 'var(--surface-strong)', color: 'var(--danger)', border: '1px solid rgba(215, 70, 85, 0.5)' }} onClick={handleReportIssue}>
              ⚠️ Report Issue
            </button>
          </div>

          <button className="btn" style={{ marginTop: '0.65rem' }} onClick={handleBookmark}>
            {route.is_saved ? 'Remove from Saved Trips' : 'Save this Route'}
          </button>

          {actionMessage && (
            <p style={{ marginTop: '0.65rem', fontSize: '0.8rem' }}>{actionMessage}</p>
          )}
        </div>
      ) : (
        <div className="card card-soft glass-card">
          <h3 style={{ marginBottom: '0.45rem' }}>Live Route Tracker</h3>
          <p style={{ marginBottom: '0.85rem', fontSize: '0.82rem' }}>
            Follow your live location against the suggested route path.
          </p>
          <RouteTrackerMap start={DEFAULT_START_COORDS} destination={DEFAULT_DESTINATION_COORDS} />
        </div>
      )}
    </div>
  );
};

export default RouteGuide;
