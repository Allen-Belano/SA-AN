import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const [start, setStart] = useState('');
  const [destination, setDestination] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (start && destination) {
      navigate(`/search?start=${start}&destination=${destination}`);
    }
  };

  return (
    <div className="screen-stack">
      <div className="section-header">
        <h1>SA/AN</h1>
        <p>Community-powered commuter navigation.</p>
      </div>

      <div className="hero-card glass-card">
        <div className="hero-content">
          <span className="hero-chip">Daily Route Companion</span>
          <p className="hero-text">
            Faster route choices, fare awareness, and trusted community guides.
          </p>
          <div className="mini-stats">
            <span className="pill">4.8 Community score</span>
            <span className="pill">Live-friendly tips</span>
          </div>
        </div>
        <div className="hero-illustration" aria-hidden="true">
          <span className="shape shape-a"></span>
          <span className="shape shape-b"></span>
          <span className="shape shape-c"></span>
        </div>
      </div>

      <div className="card card-soft">
        <h2>Where to?</h2>
        <form onSubmit={handleSearch}>
          <div className="input-group">
            <label>Current Location / Start</label>
            <input 
              type="text" 
              placeholder="e.g. EDSA Taft" 
              value={start}
              onChange={(e) => setStart(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <label>Destination</label>
            <input 
              type="text" 
              placeholder="e.g. SM North EDSA" 
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary">
            Find Routes
          </button>
        </form>
      </div>

      <div className="inline-grid">
        <h2>Recent Community Routes</h2>
        <div className="card card-soft glass-card" onClick={() => navigate('/route/1')} style={{ cursor: 'pointer' }}>
          <div className="row-between" style={{ marginBottom: '0.75rem' }}>
            <strong className="route-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              EDSA Taft 
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-secondary)' }}><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg> 
              SM North EDSA
            </strong>
            <span className="vote-badge" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg> 
              124
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '0.84rem' }}>Via MRT-3 • 35 mins • ₱28.00</p>
        </div>
        <div className="card card-soft" onClick={() => navigate('/route/2')} style={{ cursor: 'pointer' }}>
          <div className="row-between" style={{ marginBottom: '0.75rem' }}>
            <strong className="route-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Ayala Triangle 
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-secondary)' }}><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg> 
              BGC High Street
            </strong>
            <span className="vote-badge" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg> 
              89
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '0.84rem' }}>Via BGC Bus • 20 mins • ₱13.00</p>
        </div>

        <div className="card card-soft">
          <h2 style={{ marginBottom: '0.6rem' }}>Tips n&apos; Tricks</h2>
          <div className="tips-strip">
            <div className="tip-item">
              <span>💡</span>
              <div className="stack-sm">
                <b>Check one route first</b>
                <span>Pick a clear plan before stacking alternatives.</span>
              </div>
            </div>
            <div className="tip-item">
              <span>⏱️</span>
              <div className="stack-sm">
                <b>Use travel time windows</b>
                <span>Rush hour can shift fare and route speed.</span>
              </div>
            </div>
            <div className="tip-item">
              <span>🛡️</span>
              <div className="stack-sm">
                <b>Trust verified guides</b>
                <span>Community-vetted steps reduce missed transfers.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
