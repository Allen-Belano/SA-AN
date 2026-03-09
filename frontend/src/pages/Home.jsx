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
    <div>
      <div style={{ textAlign: 'center', marginBottom: '2rem', marginTop: '1rem' }}>
        <h1 style={{ color: 'var(--primary-color)', fontSize: '2.5rem', marginBottom: '0.25rem' }}>SA/AN</h1>
        <p>Community-Powered Commuter Navigation</p>
      </div>

      <div className="card">
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
          <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
            Find Routes
          </button>
        </form>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <h2>Recent Community Routes</h2>
        <div className="card" onClick={() => navigate('/route/1')} style={{ cursor: 'pointer' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <strong style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              EDSA Taft 
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-secondary)' }}><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg> 
              SM North EDSA
            </strong>
            <span style={{ color: 'var(--secondary-color)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg> 
              124
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '0.875rem' }}>Via MRT-3 • 35 mins • ₱28.00</p>
        </div>
        <div className="card" onClick={() => navigate('/route/2')} style={{ cursor: 'pointer' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <strong style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Ayala Triangle 
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-secondary)' }}><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg> 
              BGC High Street
            </strong>
            <span style={{ color: 'var(--secondary-color)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg> 
              89
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '0.875rem' }}>Via BGC Bus • 20 mins • ₱13.00</p>
        </div>
      </div>
    </div>
  );
};

export default Home;
