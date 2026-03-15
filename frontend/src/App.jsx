import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import RouteSearch from './pages/RouteSearch';
import RouteGuide from './pages/RouteGuide';
import Contribute from './pages/Contribute';
import Login from './pages/Login';
import Profile from './pages/Profile';
import { getStoredSession } from './api';

const introLines = [
  'For every daily biyahe.',
  'For every transfer and turn.',
  'For every commuter who wants a safer ride.',
];

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

const ProtectedRoutes = () => {
  const session = getStoredSession();

  if (!session?.token) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

const PublicOnlyRoute = () => {
  const session = getStoredSession();

  if (session?.token) {
    return <Navigate to="/" replace />;
  }

  return <Login />;
};

const AppLayout = () => {
  const location = useLocation();
  const hideNavigation = location.pathname === '/login';

  return (
    <div className="app-container">
      <div className="ambient-layer">
        <span className="orb orb-a" aria-hidden="true"></span>
        <span className="orb orb-b" aria-hidden="true"></span>
        <span className="orb orb-c" aria-hidden="true"></span>
      </div>
      <div className="content-area">
        <Routes>
          <Route path="/login" element={<PublicOnlyRoute />} />
          <Route element={<ProtectedRoutes />}>
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<RouteSearch />} />
            <Route path="/route/:id" element={<RouteGuide />} />
            <Route path="/contribute" element={<Contribute />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      {!hideNavigation && <BottomNav />}
    </div>
  );
};

const IntroScreen = () => {
  const [lineIndex, setLineIndex] = useState(0);
  const [showBrand, setShowBrand] = useState(false);

  useEffect(() => {
    const lineInterval = window.setInterval(() => {
      setLineIndex((current) => {
        if (current >= introLines.length - 1) {
          window.clearInterval(lineInterval);
          return current;
        }

        return current + 1;
      });
    }, 1800);

    const brandTimer = window.setTimeout(() => {
      setShowBrand(true);
    }, 4800);

    return () => {
      window.clearInterval(lineInterval);
      window.clearTimeout(brandTimer);
    };
  }, []);

  return (
    <div className="intro-shell" role="status" aria-label="SA/AN intro animation">
      <div className="intro-orb orb-left" aria-hidden="true"></div>
      <div className="intro-orb orb-right" aria-hidden="true"></div>
      <div className={`intro-content ${showBrand ? 'fade-out' : ''}`}>
        <span key={introLines[lineIndex]} className="intro-line">{introLines[lineIndex]}</span>
      </div>
      <div className={`intro-brand-wrap ${showBrand ? 'show' : ''}`}>
        <div className="intro-brand-center">
          <span className="brand-question q1" aria-hidden="true">?</span>
          <span className="brand-question q2" aria-hidden="true">?</span>
          <span className="brand-question q3" aria-hidden="true">?</span>
          <span className="brand-question q4" aria-hidden="true">?</span>
          <span className="brand-question q5" aria-hidden="true">?</span>
          <span className="brand-question q6" aria-hidden="true">?</span>
          <span className="brand-question q7" aria-hidden="true">?</span>
          <span className="brand-question q8" aria-hidden="true">?</span>
          <span className="brand-question q9" aria-hidden="true">?</span>
          <div className="intro-brand-word" aria-label="SA slash AN">
            <span className="brand-letter letter-s">S</span>
            <span className="brand-letter letter-a1">A</span>
            <span className="brand-separator">/</span>
            <span className="brand-letter letter-a2">A</span>
            <span className="brand-letter letter-n">N</span>
          </div>
        </div>
      </div>
    </div>
  );
};

function App() {
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    const introTimer = window.setTimeout(() => {
      setShowIntro(false);
    }, 8500);

    return () => window.clearTimeout(introTimer);
  }, []);

  if (showIntro) {
    return <IntroScreen />;
  }

  return (
    <Router>
      <AppLayout />
    </Router>
  );
}

export default App;
