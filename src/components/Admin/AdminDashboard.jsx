import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { BookFilled, DollarCircleFilled, FileAddFilled, LogoutOutlined, SafetyCertificateOutlined, TeamOutlined } from '@ant-design/icons';
import AdminLayout from './AdminLayout';
import { API_URL, getUser } from '../../auth';
import confirmLogout from '../Auth/confirmLogout';

const CARDS = [
  { title: 'Users', desc: 'View and manage user accounts.', to: '/manage/users', icon: <TeamOutlined /> },
  { title: 'Register', desc: 'Create accounts for staff and groomers.', to: '/admin/register', icon: <FileAddFilled /> },
  { title: 'Payments', desc: 'View and manage payments.', to: '/admin/payments', icon: <DollarCircleFilled /> },
  { title: 'Audit Logs', desc: 'See what happened in the system.', to: '/admin/audit-logs', icon: <BookFilled /> },
];

const peso = (n) => `₱${Number(n || 0).toLocaleString('en-PH')}`;
const when = (d) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
  ', ' +
  new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

function AdminDashboard() {
  const navigate = useNavigate();
  const user = getUser();
  const [data, setData] = useState(null); // live numbers from GET /api/admin/summary

  useEffect(() => {
    axios
      .get(`${API_URL}/admin/summary`)
      .then((response) => setData(response.data))
      .catch(() => setData(null)); // the cards still work if the numbers can't load
  }, []);

  // the four numbers an admin checks first
  const stats = [
    { label: 'Total users', value: data?.totalUsers },
    { label: 'New sign-ups (7 days)', value: data?.newSignups },
    { label: 'Failed logins (24 hours)', value: data?.failedLogins, warn: data?.failedLogins > 0 },
    { label: 'Payments this month', value: data ? peso(data.paymentsThisMonth) : undefined },
  ];

  return (
    <AdminLayout>
      <div className="adm-dash">
      <h1 className="adm-welcome">Welcome, {user?.firstName || 'Admin'}!</h1>
      <p className="adm-welcome-sub">This is the Admin Dashboard</p>

      <div className="adm-stats">
        {stats.map((stat) => (
          <div key={stat.label} className="adm-stat">
            <div className="adm-stat-label">{stat.label}</div>
            <div className={`adm-stat-value${stat.warn ? ' adm-bad' : ''}`}>{stat.value ?? '—'}</div>
          </div>
        ))}
      </div>

      <div className="adm-cards">
        {CARDS.map((card) => (
          <Link key={card.title} to={card.to} className="adm-card">
            <div>
              <h2>{card.title}</h2>
              <p>{card.desc}</p>
            </div>
            <span className="adm-card-icon">{card.icon}</span>
          </Link>
        ))}
      </div>

      {data?.recent?.length > 0 && (
        <section className="adm-recent">
          <h2>
            Recent Activity <Link to="/admin/audit-logs">View all</Link>
          </h2>
          {data.recent.slice(0, 5).map((log) => (
            <div key={log._id} className="adm-recent-row">
              <span>
                {log.action}
                {log.status === 'failed' && <b className="adm-bad"> (failed)</b>}
                <small>{[log.actorName, log.affected].filter(Boolean).join(' → ')}</small>
              </span>
              <span>{when(log.createdAt)}</span>
            </div>
          ))}
        </section>
      )}

      <div className="adm-footer">
        <button type="button" className="adm-link" onClick={() => navigate('/security')}>
          <SafetyCertificateOutlined /> Security
        </button>
        <button
          type="button"
          className="adm-link adm-logout"
          onClick={() => confirmLogout(() => navigate('/'))}
        >
          Logout <LogoutOutlined />
        </button>
      </div>
      </div>
    </AdminLayout>
  );
}

export default AdminDashboard;