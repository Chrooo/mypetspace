import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeftOutlined, UserOutlined } from '@ant-design/icons';
import { getUser } from '../../auth';
import logo from '../../assets/logo.png';
import './AdminLayout.css';

// Frame for every admin page: the maroon top bar, then the page.
function AdminLayout({ children }) {
  const navigate = useNavigate();
  const user = getUser();

  return (
    <div className="adm">
      <header className="adm-top">
        <Link to="/admin" aria-label="Admin dashboard">
          <img src={logo} alt="My Pet Space" className="adm-logo" />
        </Link>
        <div className="adm-top-right">
          <span className="adm-top-title">Admin Dashboard</span>
          <button className="adm-icon" aria-label="Back" onClick={() => navigate(-1)}>
            <ArrowLeftOutlined />
          </button>
          <button
            className="adm-avatar"
            aria-label="Profile and security"
            title={user?.fullName ? `${user.fullName} - security settings` : 'Security settings'}
            onClick={() => navigate('/security')}
          >
            <UserOutlined />
          </button>
        </div>
      </header>

      <main className="adm-page">{children}</main>
    </div>
  );
}

export default AdminLayout;