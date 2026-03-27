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
          provider: 'MRT-3 + Jeepney',
          classType: 'Fastest',
          start: "EDSA Taft",
          destination: "SM North EDSA",
          modes: ["Jeepney", "MRT-3"],
          time: "45 mins",
          fare: "₱28.00",
          votes: 124,
          author: "Juana Commuter",
          codeFrom: 'TFT',
          codeTo: 'SMN',
          departure: '06:40',
          arrival: '07:25',
          rating: 4.6,
        },
        {
          id: 3,
          provider: 'EDSA Carousel',
          classType: 'Budget',
          start: "Taft Avenue",
          destination: "SM North EDSA",
          modes: ["Bus Carousel"],
          time: "1 hr 10 mins",
          fare: "₱32.00",
          votes: 68,
          author: "MetroGuide",
          codeFrom: 'AYL',
          codeTo: 'SMN',
          departure: '07:05',
          arrival: '08:15',
          rating: 4.4,
        }
      ]);
      setLoading(false);
    }, 800);
  };

  const handleSwapLocations = () => {
    setStart((currentStart) => {
      const nextStart = destination;
      setDestination(currentStart);
      return nextStart;
    });

    if (start && destination) {
      handleSearch();
    }
  };

  return (
    <div className="screen-stack">
      <div className="row-between search-toolbar">
        <button className="btn-icon" onClick={() => navigate(-1)} aria-label="Go back">
          ←
        </button>
        <div className="toolbar-actions">
          <button type="button" className="btn-icon" aria-label="Share results">⤴</button>
          <button type="button" className="btn-icon" aria-label="More actions">⋯</button>
        </div>
      </div>

      <div className="section-header" style={{ marginTop: 0 }}>
        <h1>SA/AN Search Results</h1>
        <p>There are {results.length || 0} route options for this trip.</p>
      </div>

      <div className="route-pill-row" aria-label="Current route query">
        <span className="route-pill">
          <small>From</small>
          <b>{start || 'EDSA Taft'}</b>
        </span>
        <button
          type="button"
          className="route-pill-swap"
          onClick={handleSwapLocations}
          aria-label="Swap from and to locations"
          title="Swap locations"
        >
          ↔
        </button>
        <span className="route-pill">
          <small>To</small>
          <b>{destination || 'SM North EDSA'}</b>
        </span>
      </div>

      <div className="card card-soft glass-card">
        <form onSubmit={handleSearch} className="route-search-form">
          <div className="input-group">
            <label>From</label>
            <input 
              type="text" 
              placeholder="Start location" 
              value={start}
              onChange={(e) => setStart(e.target.value)}
              required
            />
          </div>
          <div className="input-group route-to-group">
            <label>To</label>
            <input 
              type="text" 
              placeholder="Destination" 
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-jet route-search-submit">
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
            <div key={route.id} className="card card-soft result-ticket" onClick={() => navigate(`/route/${route.id}`)} style={{ cursor: 'pointer' }}>
              <div className="row-between" style={{ marginBottom: '0.4rem' }}>
                <div className="stack-sm" style={{ gap: '0.15rem' }}>
                  <span className="muted-text" style={{ fontSize: '0.7rem' }}>{route.classType}</span>
                  <strong style={{ fontSize: '1.04rem' }}>{route.provider}</strong>
                </div>
                <div className="ticket-actions" aria-hidden="true">
                  <span>♡</span>
                  <span>🔖</span>
                </div>
              </div>

              <div className="ticket-journey" style={{ marginBottom: '0.55rem' }}>
                <div>
                  <strong>{route.codeFrom}</strong>
                  <span>{route.departure}</span>
                </div>
                <span className="journey-line">• • •</span>
                <div>
                  <strong>{route.codeTo}</strong>
                  <span>{route.arrival}</span>
                </div>
              </div>

              <div className="row-between" style={{ marginBottom: '0.45rem' }}>
                <span className="reschedule-pill">Community verified route</span>
                <span className="price-pill">{route.fare}</span>
              </div>

              <div className="row-between muted-text" style={{ fontSize: '0.74rem' }}>
                <span>★ {route.rating} • {route.time}</span>
                <span>By {route.author} • {route.votes} votes</span>
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
