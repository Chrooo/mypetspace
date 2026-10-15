import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ScissorOutlined } from '@ant-design/icons';
import SiteHeader from '../Layout/SiteHeader';
import SiteFooter from '../Layout/SiteFooter';
import bathDry from '../../assets/service-bath-dry.jpg';
import tearStain from '../../assets/service-tear-stain.jpg';
import eyeCleaning from '../../assets/service-eye-cleaning.jpg';
import nailTrimming from '../../assets/service-nail-trimming.jpg';
import earCleaning from '../../assets/service-ear-cleaning.jpg';
import dematting from '../../assets/service-dematting.jpg';
import packageBasic from '../../assets/package-basic.jpg';
import packageFull from '../../assets/package-full.jpg';
import packageMassage from '../../assets/package-massage.jpg';
import whyDog from '../../assets/why-dog.png';
import '../Layout/Layout.css';
import './Services.css';

const NOTE = "Prices may vary depending on the pet's size and kg";

const SERVICES = [
  { name: 'Bath-Dry', price: '₱200', img: bathDry },
  { name: 'Tear Stain', price: '₱100', img: tearStain },
  { name: 'Eye Cleaning', price: '₱100', img: eyeCleaning },
  { name: 'Nail Trimming', price: '₱100', img: nailTrimming },
  { name: 'Ear Cleaning', price: '₱100', img: earCleaning },
  { name: 'Dematting', price: '₱300', img: dematting },
];

const PACKAGES = [
  {
    name: 'Basic Groom',
    price: '₱300-600',
    img: packageBasic,
    inclusions: ['Bathing', 'Blow Drying', 'Nail Trimming', 'Haircut'],
  },
  {
    name: 'Full Groom',
    price: '₱400-800',
    img: packageFull,
    inclusions: ['Bathing', 'Blow Drying', 'Brushing', 'Nail Trimming', 'Ear Cleaning', 'Eye Cleaning', 'Haircut'],
  },
  {
    name: 'Groom & Massage',
    price: '₱600-1000',
    img: packageMassage,
    inclusions: ['Bathing', 'Blow Drying', 'Brushing', 'Nail Trimming', 'Ear Cleaning', 'Massage', 'Haircut', 'Eye Cleaning'],
  },
];

// edit these lines to whatever you want to promise customers
const WHY_US = [
  'Gentle, trained groomers',
  'Pet-safe products only',
  'Clean and sanitized salon',
  'CCTV secured',
  'Affordable premium care',
];

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

function SectionHead({ title }) {
  return (
    <div className="svc-head">
      <span className="svc-head-icon"><ScissorOutlined /></span>
      <div>
        <h2>{title}</h2>
        <p>Keep your furbabies clean, fresh, and fabulous!</p>
      </div>
    </div>
  );
}

function Services() {
  const packagesRef = useReveal();

  return (
    <div className="svc-page">
      <SiteHeader />

      <main>
        <div className="svc-wrap svc-layout">
          <div className="svc-main">
            <section className="svc-services">
              <SectionHead title="Grooming Services" />
              <div className="svc-grid">
                {SERVICES.map((s) => (
                  <div key={s.name} className="svc-card">
                    <div className="svc-photo"><img src={s.img} alt={s.name} /></div>
                    <div className="svc-row">
                      <h3>{s.name}</h3>
                      <span className="svc-price">{s.price}</span>
                    </div>
                    <p className="svc-note">{NOTE}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* same box size as above, fades in as you scroll down */}
            <section className="svc-packages" ref={packagesRef}>
              <SectionHead title="Grooming Packages" />
              <div className="svc-grid">
                {PACKAGES.map((p, i) => (
                  <div key={p.name} className="svc-card svc-reveal" style={{ transitionDelay: `${i * 140}ms` }}>
                    <div className="svc-photo"><img src={p.img} alt={p.name} /></div>
                    <div className="svc-row">
                      <h3>{p.name}</h3>
                      <span className="svc-price">{p.price}</span>
                    </div>
                    <p className="svc-note">{NOTE}</p>
                    <p className="svc-inc-title">Inclusions:</p>
                    <ul className="svc-inc">
                      {p.inclusions.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* pinned to the side while you scroll */}
          <aside className="svc-why">
            <h2>Why Choose Us?</h2>
            <ul>
              {WHY_US.map((text) => (
                <li key={text}>
                  <PawBullet />
                  <span>{text}</span>
                </li>
              ))}
            </ul>
            <Link to="/book/grooming" className="svc-book">Book an Appointment</Link>
            <img className="svc-why-dog" src={whyDog} alt="" aria-hidden="true" />
          </aside>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

export default Services;