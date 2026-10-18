import { Link, useNavigate } from 'react-router-dom';
import { Button, Tag } from 'antd';
import { LogoutOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { getUser, roleHome, ROLE_LABELS } from '../../auth';
import confirmLogout from '../Auth/confirmLogout';
import logo from '../../assets/logo.png';
import Planned from './Planned';
import './Layout.css';

// Frame for every logged-in page (all four dashboards and their sub-pages).
//   back:  a path, or true to go back to the user's own dashboard
//   stats: [{ label, value }]        small number boxes
//   items: [{ label, desc, to }]     cards that open other pages
function DashboardShell({ title, subtitle, back, stats = [], items = [], planned, children }) {
  const navigate = useNavigate();
  const user = getUser(); // the route guard makes sure a user exists
  const role = ROLE_LABELS[user.role] || ROLE_LABELS.customer;
  const backTo = back === true ? roleHome(user.role) : back;

  const handleLogout = () => confirmLogout(() => navigate('/'));

  return (
    <div className="dash">
      <header className="dash-top">
        <Link to="/" aria-label="My Pet Space home">
          <img src={logo} alt="My Pet Space" className="dash-logo" />
        </Link>
        <div className="dash-user">
          <span>{user.fullName}</span>
          <Tag color={role.color} style={{ fontWeight: 700 }}>{role.label}</Tag>
          <Button icon={<SafetyCertificateOutlined />} onClick={() => navigate('/security')}>Security</Button>
          <Button icon={<LogoutOutlined />} onClick={handleLogout}>Log out</Button>
        </div>
      </header>

      <main className="dash-main">
        {backTo && (
          <Link to={backTo} className="page-back">
            ← Back to dashboard
          </Link>
        )}
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-sub">{subtitle}</p>}

        {stats.length > 0 && (
          <div className="dash-stats">
            {stats.map((stat) => (
              <div key={stat.label} className="stat">
                <div className="stat-label">{stat.label}</div>
                <div className="stat-value">{stat.value}</div>
              </div>
            ))}
          </div>
        )}

        {items.length > 0 && (
          <div className="dash-cards">
            {items.map((item) => (
              <Link key={item.to} to={item.to} className="dash-card">
                <h3>{item.label}</h3>
                <p>{item.desc}</p>
              </Link>
            ))}
          </div>
        )}

        {children}
        <Planned items={planned} />
      </main>
    </div>
  );
}

export default DashboardShell;