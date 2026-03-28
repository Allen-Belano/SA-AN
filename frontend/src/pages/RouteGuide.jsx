import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import RouteTrackerMap from '../components/RouteTrackerMap';
import { getApiErrorMessage, getRouteById } from '../api';

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

  useEffect(() => {
    const loadRoute = async () => {
      setLoading(true);
      setErrorMessage('');

      try {
        const response = await getRouteById(id);
        setRouteData(response);
      } catch (error) {
        setErrorMessage(getApiErrorMessage(error, 'Unable to load route details right now.'));
      } finally {
        setLoading(false);
      }
    };

    loadRoute();
  }, [id]);

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
        <div className="row-between" style={{ marginBottom: '0.9rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'white' }}>Community Route</h2>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)' }}>Total Fare: {totalFare}</p>
          </div>
          <div className="summary-votes">
            <span style={{ display: 'block', fontSize: '1.25rem' }}>👍 {votes}</span>
            <span style={{ fontSize: '0.75rem' }}>Helpful</span>
          </div>
        </div>

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
            <button className="btn btn-secondary" style={{ flex: 1, padding: '0.75rem' }}>
              👍 Upvote
            </button>
            <button className="btn" style={{ flex: 1, background: 'var(--surface-strong)', color: 'var(--danger)', border: '1px solid rgba(215, 70, 85, 0.5)' }}>
              ⚠️ Report Issue
            </button>
          </div>
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
