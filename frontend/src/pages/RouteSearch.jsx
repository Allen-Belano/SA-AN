import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { bookmarkRoute, getApiErrorMessage, getRoutes, getStoredSession } from '../api';

const RouteSearch = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [start, setStart] = useState(searchParams.get('start') || '');
  const [destination, setDestination] = useState(searchParams.get('destination') || '');

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [sortBy, setSortBy] = useState('popular');
  const [routeMode, setRouteMode] = useState('standard');
  const [filters, setFilters] = useState({ verifiedOnly: false, maxFare: '', minVotes: '' });

  const session = getStoredSession();
  const userId = session?.user?.user_id;

  useEffect(() => {
    if (start && destination) {
      handleSearch();
    }
  }, [searchParams]);

  const mapSearchParams = () => {
    return {
      start,
      destination,
      sort: sortBy,
      mode: routeMode,
      user_id: userId,
      verified_only: filters.verifiedOnly,
      min_votes: filters.minVotes || undefined,
      max_fare: filters.maxFare || undefined,
    };
  };

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    try {
      const response = await getRoutes(mapSearchParams());
      setResults(response.routes || []);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Unable to search routes right now.'));
    } finally {
      setLoading(false);
    }
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

  const handleToggleSave = async (event, routeId, isSaved) => {
    event.stopPropagation();

    if (!userId) {
      navigate('/login');
      return;
    }

    try {
      const response = await bookmarkRoute(routeId, {
        user_id: userId,
        action: isSaved ? 'remove' : 'save',
      });

      setResults((current) => current.map((route) => (
        route.route_id === routeId
          ? { ...route, is_saved: response.saved }
          : route
      )));
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Unable to update saved routes.'));
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

        <div className="dual-grid" style={{ marginTop: '0.9rem' }}>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label>Sort</label>
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
              <option value="popular">Most popular</option>
              <option value="trusted">Most trusted</option>
              <option value="fastest">Fastest</option>
              <option value="budget">Budget</option>
              <option value="newest">Newest</option>
            </select>
          </div>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label>Mode</label>
            <select value={routeMode} onChange={(event) => setRouteMode(event.target.value)}>
              <option value="standard">Standard</option>
              <option value="personalized">Personalized</option>
            </select>
          </div>
        </div>

        <div className="dual-grid" style={{ marginTop: '0.7rem' }}>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label>Max Fare (P)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={filters.maxFare}
              onChange={(event) => setFilters((current) => ({ ...current, maxFare: event.target.value }))}
            />
          </div>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label>Minimum Votes</label>
            <input
              type="number"
              min="0"
              step="1"
              value={filters.minVotes}
              onChange={(event) => setFilters((current) => ({ ...current, minVotes: event.target.value }))}
            />
          </div>
        </div>

        <label style={{ display: 'inline-flex', gap: '0.45rem', alignItems: 'center', marginTop: '0.7rem', fontSize: '0.84rem' }}>
          <input
            type="checkbox"
            checked={filters.verifiedOnly}
            onChange={(event) => setFilters((current) => ({ ...current, verifiedOnly: event.target.checked }))}
            style={{ width: 'auto' }}
          />
          Show only verified routes
        </label>
      </div>

      <div className="inline-grid">
        <h2>Matching Routes</h2>

        {errorMessage && (
          <div className="card card-soft" style={{ border: '1px solid rgba(215, 70, 85, 0.4)' }}>
            {errorMessage}
          </div>
        )}
        
        {loading ? (
          <div className="card card-soft" style={{ textAlign: 'center', padding: '2rem' }}>
            <p style={{ marginBottom: 0 }}>Loading routes...</p>
          </div>
        ) : results.length > 0 ? (
          results.map(route => (
            <div key={route.route_id} className="card card-soft result-ticket" onClick={() => navigate(`/route/${route.route_id}`)} style={{ cursor: 'pointer' }}>
              <div className="row-between" style={{ marginBottom: '0.4rem' }}>
                <div className="stack-sm" style={{ gap: '0.15rem' }}>
                  <span className="muted-text" style={{ fontSize: '0.7rem' }}>
                    {route.is_verified ? 'Verified' : 'Community'}
                  </span>
                  <strong style={{ fontSize: '1.04rem' }}>{route.start_location} to {route.destination}</strong>
                </div>
                <div className="ticket-actions">
                  <span title="Trust score">Trust {route.trust_score}</span>
                  <button
                    type="button"
                    className="btn-icon"
                    onClick={(event) => handleToggleSave(event, route.route_id, route.is_saved)}
                    aria-label={route.is_saved ? 'Remove saved route' : 'Save route'}
                  >
                    {route.is_saved ? '★' : '☆'}
                  </button>
                </div>
              </div>

              <div className="ticket-journey" style={{ marginBottom: '0.55rem' }}>
                <div>
                  <strong>{route.start_location.slice(0, 3).toUpperCase()}</strong>
                  <span>{route.step_count} steps</span>
                </div>
                <span className="journey-line">• • •</span>
                <div>
                  <strong>{route.destination.slice(0, 3).toUpperCase()}</strong>
                  <span>{route.estimated_duration_minutes || 40} mins</span>
                </div>
              </div>

              <div className="row-between" style={{ marginBottom: '0.45rem' }}>
                <span className="reschedule-pill">{route.is_verified ? 'Community verified route' : 'Needs more verification'}</span>
                <span className="price-pill">P{Number(route.total_fare || 0).toFixed(2)}</span>
              </div>

              <div className="row-between muted-text" style={{ fontSize: '0.74rem' }}>
                <span>Trust {route.trust_score} • Votes {route.vote_score}</span>
                <span>By {route.creator_name}</span>
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
