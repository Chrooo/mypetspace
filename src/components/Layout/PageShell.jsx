import { Link } from 'react-router-dom';
import SiteHeader from './SiteHeader';
import Planned from './Planned';
import './Layout.css';

// Frame for the public pages and the booking steps.
// links: [{ label, to, primary }]  ->  buttons that open other pages
function PageShell({ title, subtitle, back, links = [], planned, children }) {
  return (
    <div className="page-shell">
      <SiteHeader />
      <main className="page-main">
        {back && (
          <Link to={back} className="page-back">
            ← Back
          </Link>
        )}
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-sub">{subtitle}</p>}

        {links.length > 0 && (
          <div className="page-links">
            {links.map((link) => (
              <Link key={link.to} to={link.to} className={`btn ${link.primary ? 'btn-pink' : 'btn-outline-teal'}`}>
                {link.label}
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

export default PageShell;