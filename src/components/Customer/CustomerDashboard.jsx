import { Link, useNavigate } from 'react-router-dom';
import { LogoutOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { getUser } from '../../auth';
import confirmLogout from '../Auth/confirmLogout';
import logo from '../../assets/logo.png';
import './CustomerDashboard.css';

/* ---------- big teal icons for the cards ---------- */
const svgProps = {
  viewBox: '0 0 64 64',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 3,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

const ProfileIcon = () => (
  <svg viewBox="0 0 64 64" fill="currentColor" aria-hidden="true">
    <circle cx="32" cy="18" r="13" />
    <path d="M4 62c0-17 12-26 28-26s28 9 28 26z" />
  </svg>
);

const PetsIcon = () => (
  <svg viewBox="0 0 64 64" fill="currentColor" aria-hidden="true">
    <ellipse cx="13" cy="30" rx="6" ry="8" transform="rotate(-20 13 30)" />
    <ellipse cx="25" cy="16" rx="6.5" ry="9" transform="rotate(-8 25 16)" />
    <ellipse cx="41" cy="16" rx="6.5" ry="9" transform="rotate(8 41 16)" />
    <ellipse cx="53" cy="30" rx="6" ry="8" transform="rotate(20 53 30)" />
    <path d="M32 29c-9 0-18 10-18 19 0 7 6 10 11 9 3-1 5-2 7-2s4 1 7 2c5 1 11-2 11-9 0-9-9-19-18-19z" />
  </svg>
);

const BookingsIcon = () => (
  <svg {...svgProps}>
    <rect x="6" y="10" width="52" height="48" rx="3" />
    <path d="M18 4v12M46 4v12M6 24h52" />
    <path d="M16 34l6 6m0-6l-6 6M29 34l6 6m0-6l-6 6" strokeWidth="2.5" />
    <path d="M16 49h10M32 49h10" strokeWidth="2.5" />
    <circle cx="48" cy="46" r="10" fill="#fff" />
    <path d="M43 46l4 4 7-8" />
  </svg>
);

const PaymentsIcon = () => (
  <svg {...svgProps}>
    <ellipse cx="40" cy="12" rx="16" ry="6" />
    <path d="M24 12v32c0 3 7 6 16 6s16-3 16-6V12M24 22c0 3 7 6 16 6s16-3 16-6M24 33c0 3 7 6 16 6s16-3 16-6" />
    <ellipse cx="22" cy="40" rx="16" ry="6" fill="#fff" />
    <path d="M6 40v12c0 3 7 6 16 6s16-3 16-6V40M6 50c0 3 7 6 16 6s16-3 16-6" />
  </svg>
);

const CARDS = [
  { label: 'My Profile', desc: 'Your account details.', to: '/account/profile', Icon: ProfileIcon },
  { label: 'My Pets', desc: 'Your pets and their details.', to: '/account/pets', Icon: PetsIcon },
  { label: 'My Bookings', desc: 'Your hotel reservations and grooming appointments.', to: '/account/bookings', Icon: BookingsIcon },
  { label: 'Payments and Receipts', desc: 'What you owe, what you paid.', to: '/account/payments', Icon: PaymentsIcon },
];

function CustomerDashboard() {
  const navigate = useNavigate();
  const user = getUser(); // the route guard makes sure a user exists

  const handleLogout = () => confirmLogout(() => navigate('/'));

  return (
    <div className="cd">
      <header className="cd-top">
        <Link to="/" aria-label="My Pet Space home">
          <img src={logo} alt="My Pet Space" className="cd-logo" />
        </Link>
        <span className="cd-top-title">User Dashboard</span>
        <Link to="/account/profile" className="cd-avatar" aria-label="My profile">
          {user.avatar ? (
            <img src={user.avatar} alt="" className="cd-avatar-img" />
          ) : (
            <>
              <span className="cd-avatar-sky" />
              <span className="cd-avatar-hill" />
            </>
          )}
        </Link>
      </header>

      <main className="cd-main">
        <h1 className="cd-welcome">Welcome, {user.fullName}!</h1>
        <p className="cd-sub">This is the User Dashboard</p>

        <div className="cd-grid">
          {CARDS.map(({ label, desc, to, Icon }) => (
            <Link key={to} to={to} className="cd-card">
              <div className="cd-card-text">
                <h3>{label}</h3>
                <p>{desc}</p>
              </div>
              <div className="cd-card-icon">
                <Icon />
              </div>
            </Link>
          ))}
        </div>

        <div className="cd-footer">
          <button type="button" className="cd-link" onClick={() => navigate('/security')}>
            <SafetyCertificateOutlined /> Security
          </button>
          <button type="button" className="cd-link cd-logout" onClick={handleLogout}>
            Logout <LogoutOutlined />
          </button>
        </div>
      </main>
    </div>
  );
}

export default CustomerDashboard;