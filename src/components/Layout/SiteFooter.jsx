import { Link } from 'react-router-dom';
import { FacebookFilled, InstagramOutlined } from '@ant-design/icons';
import logo from '../../assets/logo.png';
import './Layout.css';

const FACEBOOK_URL = 'https://www.facebook.com/mypetspacepethotel';
const INSTAGRAM_URL = 'https://www.instagram.com/mypetspace.ph?fbclid=IwY2xjawU95CFleHRuA2FlbQIxMABwZG9mBWJyaWQRMVNDWWtFNGZDSnFMUnVCenZzcnRjBmFwcF9pZBAyMjIwMzkxNzg4MjAwODkyAAEexkw1W94e8zgGHLa7U87m-V2XmXa4W_9AGhLhLDKOOpDztmKYor7Q7nI9iV8_aem_vw2k0aRx2TJQeUzJVG9T8w';
const LOCATION_URL = 'https://www.google.com/maps/place/My+Pet+Space+-+Pet+Hotel+and+Snack+Bar/@14.5380558,121.000389,15z/data=!3m1!4b1!4m6!3m5!1s0x3397c9383578f875:0xec7455699954d246!8m2!3d14.5380353!4d121.0106673!16s%2Fg%2F11trq7jps1?entry=ttu&g_ep=EgoyMDI2MTAxMi4wIKXMDSoASAFQAw%3D%3D';

// maroon bar at the bottom of the public pages
function SiteFooter() {
  return (
    <footer className="site-footer">
      <Link to="/" className="footer-brand" aria-label="My Pet Space home">
        <img className="footer-logo" src={logo} alt="" />
        <span>my</span><b>pet</b><span>space</span>
      </Link>

      <div className="footer-info">
        <span className="footer-contact">
          Contact us:
          <a href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer" aria-label="Facebook">
            <FacebookFilled />
          </a>
          <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
            <InstagramOutlined />
          </a>
          <span>0945 418 4710</span>
        </span>
        <a href={LOCATION_URL} target="_blank" rel="noopener noreferrer">Locations</a>
           <Link to="/privacy">Privacy Policy</Link>
        <Link to="/terms">Terms &amp; Conditions</Link>
      </div>

      <p className="footer-copy">© Copyright mypetspace 2026.<br />All rights reserved.</p>
    </footer>
  );
}

export default SiteFooter;