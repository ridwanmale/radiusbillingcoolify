import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const MobileBottomBar = ({ onMenuClick }) => {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <nav className="mobile-bottom-bar">
      <Link to="/" className={`bottom-nav-item ${currentPath === '/' ? 'active' : ''}`}>
        <span className="material-symbols-rounded">dashboard</span>
      </Link>
      <Link to="/vouchers" className={`bottom-nav-item ${currentPath.includes('/voucher') ? 'active' : ''}`}>
        <span className="material-symbols-rounded">wifi</span>
      </Link>
      <Link to="/pppoe/monitoring" className={`bottom-nav-item ${currentPath.includes('/pppoe') ? 'active' : ''}`}>
        <span className="material-symbols-rounded">router</span>
      </Link>
      <Link to="/online-store-hub" className={`bottom-nav-item ${currentPath.includes('store') || currentPath.includes('vendor') ? 'active' : ''}`}>
        <span className="material-symbols-rounded">storefront</span>
      </Link>
      <div className="bottom-nav-item" onClick={onMenuClick} style={{ cursor: 'pointer' }}>
        <span className="material-symbols-rounded">menu</span>
      </div>
    </nav>
  );
};

export default MobileBottomBar;
