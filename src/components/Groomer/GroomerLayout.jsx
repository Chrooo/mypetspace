import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { getUser } from '../../auth';
import logo from '../../assets/logo.png';
import './Groomer.css';

// Frame for every Groomer page: the tan top bar (logo, title, back arrow, profile photo), then the page.
function GroomerLayout({ children }) {
  const navigate = useNavigate();
  const user = getUser(); // the route guard makes sure a groomer is logged in

  return (
    <div className="gr">
      <header className="gr-top">
        <Link to="/groomer" className="gr-top-logo" aria-label="Groomer dashboard">
          <img src={logo} alt="My Pet Space" className="gr-logo" />
        </Link>
        <span className="gr-top-title">Groomer Dashboard</span>
        <button type="button" className="gr-back" onClick={() => navigate(-1)} aria-label="Go back">
          <ArrowLeftOutlined />
        </button>
        <Link to="/groomer/profile" className="gr-avatar" aria-label="My profile">
          {user?.avatar ? (
            <img src={user.avatar} alt="" />
          ) : (
            <>
              <span className="gr-avatar-sky" />
              <span className="gr-avatar-hill" />
            </>
          )}
        </Link>
      </header>

      <main className="gr-main">{children}</main>
    </div>
  );
}

export default GroomerLayout;