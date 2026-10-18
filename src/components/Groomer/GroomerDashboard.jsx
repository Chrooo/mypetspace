import { Link, useNavigate } from 'react-router-dom';
import { LogoutOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import GroomerLayout from './GroomerLayout';
import { getUser } from '../../auth';
import confirmLogout from '../Auth/confirmLogout';

const svg = { viewBox: '0 0 64 64', 'aria-hidden': true };

// the three big tan icons
const AppointmentsIcon = () => (
  <svg {...svg} fill="currentColor">
    <path d="M10 4h30l14 14v38a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4z" />
    <path d="M40 4v14h14" fill="#fff" fillOpacity="0.45" />
    <g fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="19" cy="19" r="4.5" />
      <path d="M12 31c0-5 3-7 7-7s7 2 7 7" />
      <path d="M12 40h26M12 48h16" />
      <path d="M38 52l16-18 5 5-16 18-7 2z" fill="currentColor" stroke="#fff" />
    </g>
  </svg>
);

// a badge with a scalloped edge and a % sign
const ServicesIcon = () => (
  <svg {...svg}>
    <g fill="currentColor">
      <circle cx="32" cy="32" r="22" />
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i * Math.PI) / 6;
        return <circle key={i} cx={32 + 23 * Math.cos(a)} cy={32 + 23 * Math.sin(a)} r="7" />;
      })}
    </g>
    <g fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round">
      <circle cx="24" cy="23" r="4.5" />
      <circle cx="40" cy="41" r="4.5" />
      <path d="M41 21L23 43" />
    </g>
  </svg>
);

const ProfileIcon = () => (
  <svg {...svg} fill="currentColor">
    <circle cx="32" cy="18" r="13" />
    <path d="M4 62c0-17 12-26 28-26s28 9 28 26z" />
  </svg>
);

const CARDS = [
  { title: 'Appointments', desc: 'View and update your grooming appointments.', to: '/groomer/appointments', Icon: AppointmentsIcon },
  { title: 'Services', desc: 'Prices and what each service includes.', to: '/groomer/services', Icon: ServicesIcon },
  { title: 'Profile', desc: 'Your account details.', to: '/groomer/profile', Icon: ProfileIcon },
];

function GroomerDashboard() {
  const navigate = useNavigate();
  const user = getUser();

  return (
    <GroomerLayout>
      <div className="gr-dash">
      <h1 className="gr-h1">Welcome, {user?.fullName}!</h1>
      <p className="gr-sub">This is the Groomer Dashboard</p>

      <div className="gr-cards">
        {CARDS.map(({ title, desc, to, Icon }) => (
          <Link key={to} to={to} className="gr-card">
            <div>
              <h2>{title}</h2>
              <p>{desc}</p>
            </div>
            <span className="gr-card-icon">
              <Icon />
            </span>
          </Link>
        ))}
      </div>

      <div className="gr-footer">
        <button type="button" className="gr-link" onClick={() => navigate('/security')}>
          <SafetyCertificateOutlined /> Security
        </button>
        <button
          type="button"
          className="gr-link gr-logout"
          onClick={() => confirmLogout(() => navigate('/'))}
        >
          Logout <LogoutOutlined />
        </button>
      </div>
      </div>
    </GroomerLayout>
  );
}

export default GroomerDashboard;