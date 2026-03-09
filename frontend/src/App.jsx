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
        <div className="nav-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
        </div>
        Home
      </Link>
      <Link to="/search" className={isActive('/search')}>
        <div className="nav-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        </div>
        Search
      </Link>
      <Link to="/contribute" className={isActive('/contribute')}>
        <div className="nav-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        </div>
        Contribute
      </Link>
      <Link to="/profile" className={isActive('/profile')}>
        <div className="nav-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
        </div>
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
