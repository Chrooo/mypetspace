import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeftOutlined, UserOutlined } from '@ant-design/icons';
import { logout } from '../../auth';
import logo from '../../assets/logo.png';
import './AdminLayout.css';

// the sidebar (label -> page)
const MENU = [
  { label: 'Dashboard', to: '/admin' },
  { label: 'Users', to: '/manage/users' },
  { label: 'Payments', to: '/manage/payments' },
  { label: 'Audit Logs', to: '/admin/audit-logs' },
  { label: 'Register/Create', to: '/manage/users' },
];

// "Oct 15, 2026" and "10:00 AM"
export const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
export const fmtTime = (d) => new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

// Frame for the admin pages: top bar + sidebar.
//   title:  shown in the top bar and as the page heading
//   active: which sidebar label is highlighted
function AdminLayout({ title, active, children }) {
  const navigate = useNavigate();

  return (
    <div className="adm">
      <header className="adm-top">
        <div className="adm-top-left">
          <Link to="/" aria-label="My Pet Space home">
            <img src={logo} alt="My Pet Space" className="adm-logo" />
          </Link>
          <h2>Admin Dashboard</h2>
        </div>
        <div className="adm-icons">
          <button className="adm-icon" aria-label="Back" onClick={() => navigate(-1)}>
            <ArrowLeftOutlined />
          </button>
          <button className="adm-icon" aria-label="Security" onClick={() => navigate('/security')}>
            <UserOutlined />
          </button>
        </div>
      </header>

      <div className="adm-body">
        <nav className="adm-side">
          {MENU.map((item) => (
            <Link key={item.label} to={item.to} className={`adm-link${item.label === active ? ' active' : ''}`}>
              {item.label}
            </Link>
          ))}
          <button
            className="adm-link"
            onClick={() => {
              logout();
              navigate('/');
            }}
          >
            Logout
          </button>
        </nav>

        <main className="adm-main">
          <h1 className="adm-title">{title}</h1>
          {children}
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;