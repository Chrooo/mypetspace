import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { message } from 'antd';
import { ArrowLeftOutlined, SearchOutlined } from '@ant-design/icons';
import { getUser, roleHome } from '../../auth';
import confirmLogout from '../Auth/confirmLogout';
import logo from '../../assets/logo.png';
import './Layout.css';

const LINKS = [
  { label: 'Home', to: '/' },
  { label: 'About', to: '/about' },
  { label: 'Services', to: '/services' },
  { label: 'Rooms', to: '/rooms' },
];

// what the search box understands: a word in the text opens that page
const SEARCH_PAGES = [
  { words: ['room', 'boarding', 'kitty', 'suite', 'stay', 'staycation', 'hotel', 'deluxe', 'robust', 'five star', 'peak', 'holiday'], to: '/rooms' },
  { words: ['groom', 'bath', 'nail', 'ear', 'eye', 'tear', 'dematt', 'service', 'package', 'massage'], to: '/services' },
  { words: ['about', 'contact', 'address', 'location', 'who'], to: '/about' },
  { words: ['term', 'condition', 'policy', 'privacy'], to: '/terms' },
  { words: ['receipt', 'payment', 'paid', 'booking', 'reservation', 'appointment'], to: '/account/bookings', customerOnly: true },
  { words: ['home'], to: '/' },
];
const PROFILE = { customer: '/account/profile', staff: '/staff/profile', admin: '/admin/profile', groomer: '/groomer/profile' };

// top bar shared by the landing page and every public page
// account: shows a back arrow and the user's avatar instead of the Dashboard / Log out buttons (the Receipt page)
// backTo: where the back arrow goes (default: one page back)
function SiteHeader({ account = false, backTo }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(getUser());
  const [query, setQuery] = useState('');

  const onSearch = (e) => {
    e.preventDefault();
    const text = query.trim().toLowerCase();
    if (!text) return;
    const hit = SEARCH_PAGES.find((p) => (!p.customerOnly || user?.role === 'customer') && p.words.some((w) => text.includes(w)));
    if (hit) {
      setQuery('');
      navigate(hit.to);
    } else {
      message.info('No page matches that. Try "rooms", "grooming", "about" or "receipt".');
    }
  };

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
        <form className="site-search" role="search" onSubmit={onSearch}>
          <input type="search" aria-label="Search" value={query} onChange={(e) => setQuery(e.target.value)} />
          <button type="submit" aria-label="Search"><SearchOutlined /></button>
        </form>
        {user && account ? (
          <>
            <button type="button" className="site-circle" aria-label="Back" onClick={() => (backTo ? navigate(backTo) : navigate(-1))}>
              <ArrowLeftOutlined />
            </button>
            <Link to={PROFILE[user.role] || roleHome(user.role)} className="site-avatar" aria-label="My profile">
              {user.avatar ? <img src={user.avatar} alt="" /> : (<><span className="sky" /><span className="hill" /></>)}
            </Link>
          </>
        ) : user ? (
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