import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { HomeOutlined } from '@ant-design/icons';
import SiteHeader from '../Layout/SiteHeader';
import SiteFooter from '../Layout/SiteFooter';
import dayBoarding from '../../assets/room-day-boarding.jpg';
import dashingDeluxe from '../../assets/room-dashing-deluxe.jpg';
import robustRoom from '../../assets/room-robust-room.jpg';
import robustKitty from '../../assets/room-robust-kitty.jpg';
import royalKitty from '../../assets/room-royal-kitty.jpg';
import coupleSuite from '../../assets/room-couple-suite.jpg';
import fiveStar from '../../assets/room-five-star.jpg';
import staycation from '../../assets/room-staycation.jpg';
import peakHoliday from '../../assets/room-peak-holiday.jpg';
import amenitiesCat from '../../assets/rooms-cat.png';
import '../Layout/Layout.css';
import './Services.css'; // reuses the same layout, cards and pinned panel
import './Rooms.css';    // only the small differences for this page

const SUBTITLE = 'Keep your furbabies clean, fresh, and fabulous!';
const SPECIAL_NOTE = 'Special Rates do not apply during HOLIDAYS & PEAK SEASONS.';

const HOURLY = 'First 3 hours start at ₱355 + ₱75 per succeeding hour';
const SEMI = '₱689/Overnight (fits up to Semi-Medium pets)';
const LARGE = '₱889/Overnight (fits up to Large to Extra Large pets)';

// each section = one heading + one row of cards
const SECTIONS = [
  {
    title: 'Boarding Rates',
    subtitle: SUBTITLE,
    rooms: [
      { name: 'Day Boarding', note: HOURLY, img: dayBoarding },
      { name: 'Dashing Deluxe', note: SEMI, img: dashingDeluxe },
      { name: 'Robust Room', note: LARGE, img: robustRoom },
    ],
  },
  {
    title: 'Royal and Suite Rates',
    subtitle: SUBTITLE,
    rooms: [
      { name: 'Robust Kitty', note: HOURLY, img: robustKitty },
      { name: 'Royal Kitty', note: SEMI, img: royalKitty },
      { name: 'Couple Suite', note: LARGE, img: coupleSuite },
    ],
  },
  {
    title: 'Best-Seller Rates',
    subtitle: SPECIAL_NOTE,
    rooms: [
      {
        name: 'Five Star',
        sub: '5 consecutive stay',
        note: 'Starts at ₱669/Overnight. It includes FREE Quick Rinse Warm Bath.',
        img: fiveStar,
      },
      {
        name: 'Staycation',
        sub: '15 consecutive stay',
        note: 'Starts at ₱649/Overnight. It includes FREE Quick Rinse Warm Bath and Dry Cleansing Bathe.',
        img: staycation,
      },
      { name: 'Peak/Holiday', note: 'Surcharge Applies', img: peakHoliday },
    ],
  },
];

// edit these lines to change the amenities list
const AMENITIES = ['Air Condition', 'Comfortable Bed', 'Play Area', '24/7 CCTV Monitoring'];

// adds "is-visible" to every .svc-reveal inside the ref'd element when it scrolls into view
function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return undefined;
    const items = root.querySelectorAll('.svc-reveal');
    if (!('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('is-visible'));
      return undefined;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    items.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return ref;
}

function PawBullet() {
  return (
    <svg className="svc-paw" viewBox="0 0 64 64" aria-hidden="true">
      <ellipse cx="32" cy="42" rx="14" ry="12" />
      <ellipse cx="12" cy="28" rx="6" ry="8" transform="rotate(-20 12 28)" />
      <ellipse cx="24" cy="15" rx="6" ry="9" transform="rotate(-8 24 15)" />
      <ellipse cx="40" cy="15" rx="6" ry="9" transform="rotate(8 40 15)" />
      <ellipse cx="52" cy="28" rx="6" ry="8" transform="rotate(20 52 28)" />
    </svg>
  );
}

function SectionHead({ title, subtitle }) {
  return (
    <div className="svc-head">
      <span className="svc-head-icon"><HomeOutlined /></span>
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
    </div>
  );
}

function Rooms() {
  const mainRef = useReveal();

  return (
    <div className="svc-page rooms-page">
      <SiteHeader />

      <main>
        <div className="svc-wrap svc-layout">
          <div className="svc-main" ref={mainRef}>
            {SECTIONS.map((section, sIndex) => (
              <section key={section.title} className="rooms-section">
                <SectionHead title={section.title} subtitle={section.subtitle} />
                <div className="svc-grid">
                  {section.rooms.map((r, i) => (
                    <div
                      key={r.name}
                      // the first section shows right away, the others fade in as you scroll
                      className={`svc-card${sIndex > 0 ? ' svc-reveal' : ''}`}
                      style={sIndex > 0 ? { transitionDelay: `${i * 140}ms` } : undefined}
                    >
                      <div className="svc-photo"><img src={r.img} alt={r.name} /></div>
                      <div className="svc-row">
                        <h3>{r.name}</h3>
                      </div>
                      {r.sub && <p className="rooms-sub">{r.sub}</p>}
                      <p className="svc-note">{r.note}</p>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>

          {/* pinned to the side while you scroll */}
          <aside className="svc-why rooms-amenities">
            <h2>Room Amenities</h2>
            <ul>
              {AMENITIES.map((text) => (
                <li key={text}>
                  <PawBullet />
                  <span>{text}</span>
                </li>
              ))}
            </ul>
            <Link to="/book/room" className="svc-book">Book a Room Now</Link>
            <img className="svc-why-dog" src={amenitiesCat} alt="" aria-hidden="true" />
          </aside>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

export default Rooms;