import { useState } from 'react';
import { Link } from 'react-router-dom';
import { SearchOutlined } from '@ant-design/icons';
import { getUser, logout } from '../../auth';
import logo from '../../assets/logo.png';
import './Landing.css';

// small decorative paw print (CSS decides the color and position)
function Paw({ className }) {
  return (
    <svg className={`paw ${className}`} viewBox="0 0 64 64" aria-hidden="true">
      <ellipse cx="32" cy="42" rx="14" ry="12" />
      <ellipse cx="12" cy="28" rx="6" ry="8" transform="rotate(-20 12 28)" />
      <ellipse cx="24" cy="15" rx="6" ry="9" transform="rotate(-8 24 15)" />
      <ellipse cx="40" cy="15" rx="6" ry="9" transform="rotate(8 40 15)" />
      <ellipse cx="52" cy="28" rx="6" ry="8" transform="rotate(20 52 28)" />
    </svg>
  );
}

function Landing() {
  const [user, setUser] = useState(getUser());

  const handleLogout = () => {
    logout();
    setUser(null);
  };

  // the booking pages are not built yet, so both hero buttons lead to sign up (or the dashboard if logged in)
  const startLink = user ? '/dashboard' : '/signup';

  return (
    <div className="landing">
      {/* decorative background shapes */}
      <svg className="blob blob-pink" viewBox="0 0 600 420" aria-hidden="true">
        <path
          d="M0 0 H470 C505 60 430 120 390 160 C340 210 340 270 250 300 C170 330 80 330 0 400 Z"
          fill="#ffd3d3"
        />
        <path
          d="M0 0 H425 C450 60 400 110 360 150 C310 195 300 250 225 280 C150 310 70 305 0 370 Z"
          fill="#ffb3b3"
        />
      </svg>
      <svg className="blob blob-teal" viewBox="0 0 600 440" aria-hidden="true">
        <path
          d="M600 0 C520 10 470 60 430 120 C390 180 330 200 250 250 C170 300 110 360 90 440 H600 Z"
          fill="#a8d4d4"
        />
        <path
          d="M600 45 C540 60 500 105 465 155 C425 210 365 235 290 280 C215 325 170 385 150 440 H600 Z"
          fill="#539c9e"
        />
      </svg>
      <Paw className="paw-1" />
      <Paw className="paw-2" />
      <Paw className="paw-3" />

      {/* top bar */}
      <header className="landing-nav">
        <Link to="/" aria-label="My Pet Space home">
          <img src={logo} alt="My Pet Space" className="landing-logo" />
        </Link>

        <nav className="landing-links" aria-label="Main">
          <Link to="/">Home</Link>
          {/* these will scroll to their sections / open their pages in the next modules */}
          <a href="#about">About</a>
          <a href="#services">Services</a>
          <a href="#rooms">Rooms</a>
          <a href="#grooming">Grooming</a>
        </nav>

        <div className="landing-actions">
          <button type="button" className="icon-btn" aria-label="Search" title="Search (coming soon)">
            <SearchOutlined />
          </button>
          {user ? (
            <>
              <Link to="/dashboard" className="btn btn-outline-teal">Dashboard</Link>
              <button type="button" className="btn btn-pink" onClick={handleLogout}>Log out</button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-outline-teal">Login</Link>
              <Link to="/signup" className="btn btn-pink">Register</Link>
            </>
          )}
        </div>
      </header>

      {/* hero text */}
      <main className="landing-hero">
        <p className="hero-welcome">Welcome to</p>
        <h1 className="hero-title" aria-label="MyPetSpace">
          <span className="pink">My</span>
          <span className="teal">Pet</span>
          <span className="pink">Space</span>
        </h1>
        <p className="hero-tagline">A pet-friendly hotel and grooming services for your fur babies.</p>

        <div className="hero-actions">
          <Link to={startLink} className="btn btn-lg btn-outline-pink">Book a Room</Link>
          <Link to={startLink} className="btn btn-lg btn-outline-teal">Book Grooming</Link>
        </div>
      </main>
    </div>
  );
}

export default Landing;