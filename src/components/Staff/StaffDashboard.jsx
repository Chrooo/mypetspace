import { Link, useNavigate } from 'react-router-dom';
import { LogoutOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import StaffLayout from './StaffLayout';
import { getUser, logout } from '../../auth';

/* ---------- big pink icons for the cards (same style as the user dashboard) ---------- */
const line = { viewBox: '0 0 64 64', fill: 'none', stroke: 'currentColor', strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };

const ProfileIcon = () => (
  <svg viewBox="0 0 64 64" fill="currentColor" aria-hidden="true">
    <circle cx="32" cy="18" r="13" />
    <path d="M4 62c0-17 12-26 28-26s28 9 28 26z" />
  </svg>
);

const CheckInIcon = () => (
  <svg viewBox="0 0 64 64" fill="currentColor" aria-hidden="true">
    <circle cx="32" cy="32" r="28" />
    <path d="M18 33l10 10 19-21" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CheckOutIcon = () => (
  <svg {...line}>
    <rect x="22" y="12" width="38" height="42" rx="3" />
    <path d="M32 6v12M50 6v12M22 26h38" />
    <circle cx="18" cy="38" r="14" fill="#fff" />
    <path d="M18 29v10l6 4" />
  </svg>
);

const BookingsIcon = () => (
  <svg {...line}>
    <rect x="6" y="10" width="52" height="48" rx="3" />
    <path d="M18 4v12M46 4v12M6 24h52" />
    <path d="M16 34l6 6m0-6l-6 6M29 34l6 6m0-6l-6 6" strokeWidth="2.5" />
    <path d="M16 49h10M32 49h10" strokeWidth="2.5" />
    <circle cx="48" cy="46" r="10" fill="#fff" />
    <path d="M43 46l4 4 7-8" />
  </svg>
);

const RoomsIcon = () => (
  <svg {...line}>
    <path d="M4 30L32 6l28 24" />
    <path d="M12 26v32h40V26" />
    <path d="M25 58V40a7 7 0 0114 0v18" />
  </svg>
);

// Appointments and Bookings are one page now.
const CARDS = [
  { label: 'My Profile', desc: 'Your account details.', to: '/security', Icon: ProfileIcon },
  { label: 'Check-ins', desc: 'Hotel stays for pets.', to: '/manage/reservations', Icon: CheckInIcon },
  { label: 'Check-outs', desc: 'Hotel stays going home.', to: '/manage/reservations', Icon: CheckOutIcon },
  { label: 'Bookings', desc: 'Grooming appointments, hotel stays and payments.', to: '/manage/bookings', Icon: BookingsIcon },
  { label: 'Rooms', desc: 'Room availability and their status.', to: '/manage/rooms', Icon: RoomsIcon },
];

function StaffDashboard() {
  const navigate = useNavigate();
  const user = getUser();

  return (
    <StaffLayout>
      <div className="sd-dash">
        <h1 className="sd-welcome">Welcome, {user?.fullName || 'Staff'}!</h1>
        <p className="sd-sub">This is the Staff Dashboard</p>

        <div className="sd-grid">
          {CARDS.map(({ label, desc, to, Icon }) => (
            <Link key={label} to={to} className="sd-card">
              <div className="sd-card-text">
                <h3>{label}</h3>
                <p>{desc}</p>
              </div>
              <div className="sd-card-icon">
                <Icon />
              </div>
            </Link>
          ))}
        </div>

        <div className="sd-footer">
          <button type="button" className="sd-link" onClick={() => navigate('/security')}>
            <SafetyCertificateOutlined /> Security
          </button>
          <button
            type="button"
            className="sd-link"
            onClick={() => {
              logout();
              navigate('/');
            }}
          >
            Logout <LogoutOutlined />
          </button>
        </div>
      </div>
    </StaffLayout>
  );
}

export default StaffDashboard;