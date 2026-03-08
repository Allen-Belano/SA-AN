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
    <div>
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', marginRight: '1rem' }}>
          ⬅️
        </button>
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Search Routes</h1>
      </div>

      <div className="card">
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
          <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>
            Update Search
          </button>
        </form>
      </div>

      <div style={{ marginTop: '1.5rem' }}>
        <h2>Matching Routes</h2>
        
        {loading ? (
          <p style={{ textAlign: 'center', padding: '2rem' }}>Loading routes...</p>
        ) : results.length > 0 ? (
          results.map(route => (
            <div key={route.id} className="card" onClick={() => navigate(`/route/${route.id}`)} style={{ cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <strong style={{ fontSize: '1.1rem' }}>Via {route.modes.join(' + ')}</strong>
                <span style={{ color: 'var(--secondary-color)', fontWeight: 'bold' }}>👍 {route.votes}</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                {route.time} • Est. Fare: {route.fare}
              </p>
              <div style={{ fontSize: '0.75rem', marginTop: '0.75rem', color: '#9ca3af' }}>
                By: {route.author} | Verified
              </div>
            </div>
          ))
        ) : (
          <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
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
