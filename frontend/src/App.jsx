import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import RouteSearch from './pages/RouteSearch';
import RouteGuide from './pages/RouteGuide';
import Contribute from './pages/Contribute';

const BottomNav = () => {
  const location = useLocation();
  const isActive = (path) => location.pathname === path ? 'nav-item active' : 'nav-item';
  return (
    <div className="bottom-nav">
      <Link to="/" className={isActive('/')}>
        <div className="nav-icon">📍</div>
        Home
      </Link>
      <Link to="/search" className={isActive('/search')}>
        <div className="nav-icon">🔍</div>
        Search
      </Link>
      <Link to="/contribute" className={isActive('/contribute')}>
        <div className="nav-icon">➕</div>
        Contribute
      </Link>
      <Link to="/profile" className={isActive('/profile')}>
        <div className="nav-icon">👤</div>
        Profile
      </Link>
    </div>
  );
};

function App() {
  return (
    <Router>
      <div className="app-container">
        <div className="content-area">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<RouteSearch />} />
            <Route path="/route/:id" element={<RouteGuide />} />
            <Route path="/contribute" element={<Contribute />} />
            <Route path="/profile" element={<h2>User Profile Placeholder</h2>} />
          </Routes>
        </div>
        <BottomNav />
      </div>
    </Router>
  );
}

export default App;
