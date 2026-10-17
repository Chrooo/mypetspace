import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { getUser, roleHome } from '../../auth';
import logo from '../../assets/logo.png';
import '../Admin/AdminLayout.css'; // the shared table / pills / pagination styles (DataTable) live here
import './StaffLayout.css';

// Frame for the staff pages, styled like the user dashboard but in the staff (pink) colors:
// pink top bar with the logo, the title, a back arrow and the avatar, then the page.
// (Admins can open the shared Manage pages too, so the title and logo link follow the role.)
function StaffLayout({ children }) {
  const navigate = useNavigate();
  const user = getUser();
  const home = roleHome(user?.role);
  const title = user?.role === 'admin' ? 'Admin Dashboard' : 'Staff Dashboard';

  return (
    <div className="sd">
      <header className="sd-top">
        <Link to={home} aria-label={title}>
          <img src={logo} alt="My Pet Space" className="sd-logo" />
        </Link>
        <div className="sd-top-right">
          <span className="sd-top-title">{title}</span>
          <button type="button" className="sd-back" aria-label="Back" onClick={() => navigate(-1)}>
            <ArrowLeftOutlined />
          </button>
          <button type="button" className="sd-avatar" aria-label="Profile and security" onClick={() => navigate('/security')}>
            {user?.avatar ? (
              <img src={user.avatar} alt="" className="sd-avatar-img" />
            ) : (
              <>
                <span className="sd-avatar-sky" />
                <span className="sd-avatar-hill" />
              </>
            )}
          </button>
        </div>
      </header>

      <main className="sd-main">{children}</main>
    </div>
  );
}

export default StaffLayout;