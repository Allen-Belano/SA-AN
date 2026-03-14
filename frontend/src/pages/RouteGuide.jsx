import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const RouteGuide = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Mock route data
  const route = {
    id: 1,
    start: "EDSA Taft",
    destination: "SM North EDSA",
    time: "45 mins",
    totalFare: "₱28.00",
    votes: 124,
    steps: [
      {
        id: 1,
        instruction: "Walk to MRT-3 Taft Avenue Station entrance.",
        vehicle: "Walk",
        fare: null,
        icon: "🚶‍♂️"
      },
      {
        id: 2,
        instruction: "Board the Northbound train. Ride for 12 stations.",
        vehicle: "MRT-3",
        fare: "₱28.00 (Regular) | ₱22.00 (Discounted)",
        icon: "🚆"
      },
      {
        id: 3,
        instruction: "Alight at North Avenue Station.",
        vehicle: "Drop-off",
        fare: null,
        icon: "📍"
      },
      {
        id: 4,
        instruction: "Walk through Trinoma connection bridge until you reach SM North EDSA.",
        vehicle: "Walk",
        fare: null,
        icon: "🚶‍♀️"
      }
    ]
  };

  const [activeTab, setActiveTab] = useState('steps');

  return (
    <div className="screen-stack">
      <div className="row-between">
        <button className="btn-icon" onClick={() => navigate(-1)} aria-label="Go back">
          ←
        </button>
        <h1 style={{ margin: 0, flex: 1, marginLeft: '0.5rem', fontSize: '1.2rem' }}>
          {route.start} to {route.destination}
        </h1>
      </div>

      <div className="card route-summary">
        <div className="row-between" style={{ marginBottom: '0.9rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'white' }}>{route.time}</h2>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)' }}>Total Fare: {route.totalFare}</p>
          </div>
          <div className="summary-votes">
            <span style={{ display: 'block', fontSize: '1.25rem' }}>👍 {route.votes}</span>
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
            {route.steps.map(step => (
              <div className="step-item" key={step.id}>
                <div className="step-icon">{step.icon}</div>
                <div className="step-content">
                  <p style={{ margin: '0 0 0.5rem', fontWeight: '500', color: 'var(--text-primary)' }}>
                    {step.instruction}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Type: <strong style={{ color: 'var(--primary-color)' }}>{step.vehicle}</strong>
                  </p>
                  {step.fare && (
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--secondary-color)' }}>
                      Fare: {step.fare}
                    </p>
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
        <div className="card card-soft glass-card" style={{ height: '350px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem', animation: 'floatY 4.5s ease-in-out infinite' }}>🗺️</div>
          <h3 style={{ marginBottom: '0.4rem' }}>Map Render Space</h3>
          <p style={{ textAlign: 'center' }}>Integration with Mapbox or Google Maps goes here.</p>
          <button className="btn btn-primary" style={{ width: 'auto', marginTop: '1rem' }}>
            Start Navigation
          </button>
        </div>
      )}
    </div>
  );
};

export default RouteGuide;
