import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const RouteSearch = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [start, setStart] = useState(searchParams.get('start') || '');
  const [destination, setDestination] = useState(searchParams.get('destination') || '');

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (start && destination) {
      handleSearch();
    }
  }, [searchParams]);

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    
    // Simulate API call for MVP
    setTimeout(() => {
      setResults([
        {
          id: 1,
          start: "EDSA Taft",
          destination: "SM North EDSA",
          modes: ["Jeepney", "MRT-3"],
          time: "45 mins",
          fare: "₱28.00",
          votes: 124,
          author: "Juana Commuter"
        },
        {
          id: 3,
          start: "Taft Avenue",
          destination: "SM North EDSA",
          modes: ["Bus Carousel"],
          time: "1 hr 10 mins",
          fare: "₱32.00",
          votes: 68,
          author: "MetroGuide"
        }
      ]);
      setLoading(false);
    }, 800);
  };

  return (
    <div className="screen-stack">
      <div className="row-between">
        <button className="btn-icon" onClick={() => navigate(-1)} aria-label="Go back">
          ←
        </button>
        <h1 style={{ margin: 0, flex: 1, marginLeft: '0.5rem' }}>Search Routes</h1>
      </div>

      <div className="card card-soft glass-card">
        <form onSubmit={handleSearch}>
          <div className="input-group">
            <input 
              type="text" 
              placeholder="Start location..." 
              value={start}
              onChange={(e) => setStart(e.target.value)}
              required
            />
          </div>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <input 
              type="text" 
              placeholder="Destination..." 
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary">
            Update Search
          </button>
        </form>
      </div>

      <div className="inline-grid">
        <h2>Matching Routes</h2>
        
        {loading ? (
          <div className="card card-soft" style={{ textAlign: 'center', padding: '2rem' }}>
            <p style={{ marginBottom: 0 }}>Loading routes...</p>
          </div>
        ) : results.length > 0 ? (
          results.map(route => (
            <div key={route.id} className="card card-soft" onClick={() => navigate(`/route/${route.id}`)} style={{ cursor: 'pointer' }}>
              <div className="row-between" style={{ marginBottom: '0.25rem' }}>
                <strong style={{ fontSize: '1rem' }}>Via {route.modes.join(' + ')}</strong>
                <span className="vote-badge">👍 {route.votes}</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                {route.time} • Est. Fare: {route.fare}
              </p>
              <div className="muted-text" style={{ fontSize: '0.75rem', marginTop: '0.75rem' }}>
                By: {route.author} | Verified
              </div>
            </div>
          ))
        ) : (
          <div className="card card-soft" style={{ textAlign: 'center', padding: '2rem' }}>
            <p style={{ marginBottom: '1rem' }}>No community routes found yet.</p>
            <button className="btn btn-secondary" onClick={() => navigate('/contribute')}>
              Be the first to add this route!
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RouteSearch;
