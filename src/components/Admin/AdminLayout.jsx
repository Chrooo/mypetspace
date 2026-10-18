import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeftOutlined } from '@ant-design/icons';
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
            aria-label="My profile"
            title={user?.fullName ? `${user.fullName} - my profile` : 'My profile'}
            onClick={() => navigate('/admin/profile')}
          >
            {user?.avatar ? (
              <img src={user.avatar} alt="" className="adm-avatar-img" />
            ) : (
              <>
                <span className="adm-avatar-sky" />
                <span className="adm-avatar-hill" />
              </>
            )}
          </button>
        </div>
      </header>

      <main className="adm-page">{children}</main>
    </div>
  );
}

export default AdminLayout;