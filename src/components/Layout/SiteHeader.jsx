import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { SearchOutlined } from '@ant-design/icons';
import { getUser } from '../../auth';
import confirmLogout from '../Auth/confirmLogout';
import logo from '../../assets/logo.png';
import './Layout.css';

const LINKS = [
  { label: 'Home', to: '/' },
  { label: 'About', to: '/about' },
  { label: 'Services', to: '/services' },
  { label: 'Rooms', to: '/rooms' },
];

// top bar shared by the landing page and every public page
function SiteHeader() {
  const navigate = useNavigate();
  const [user, setUser] = useState(getUser());

  const handleLogout = () =>
    confirmLogout(() => {
      setUser(null);
      navigate('/');
    });

  return (
    <header className="site-header">
      <Link to="/" aria-label="My Pet Space home">
        <img src={logo} alt="My Pet Space" className="site-logo" />
      </Link>

      <nav className="site-links" aria-label="Main">
        {LINKS.map((link) => (
          <NavLink key={link.to} to={link.to} end={link.to === '/'}>
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="site-actions">
        <label className="site-search">
          <input type="search" aria-label="Search" />
          <SearchOutlined />
        </label>
        {user ? (
          <>
            <Link to="/dashboard" className="btn btn-outline-teal">Dashboard</Link>
            <button type="button" className="btn btn-pink" onClick={handleLogout}>Log out</button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn btn-outline-teal">Login</Link>
            <Link to="/signup" className="btn btn-pink">Register</Link>
          </>
        )}
      </div>
    </header>
  );
}

export default SiteHeader;