import {
  HomeOutlined,
  MedicineBoxOutlined,
  SmileOutlined,
  VideoCameraOutlined,
  ScissorOutlined,
  CarOutlined,
  ShoppingOutlined,
  CoffeeOutlined,
} from '@ant-design/icons';
import SiteHeader from '../Layout/SiteHeader';
import SiteFooter from '../Layout/SiteFooter';
import offer1 from '../../assets/offer1.jpg';
import offer2 from '../../assets/offer2.jpg';
import offer3 from '../../assets/offer3.jpg';
import offer4 from '../../assets/offer4.jpg';
import offer5 from '../../assets/offer5.jpg';
import '../Layout/Layout.css';
import './About.css';

const FACILITIES = [
  { label: 'Spacious Room', icon: <HomeOutlined />, tone: 'teal' },
  { label: 'Sanitized & Disinfected', icon: <MedicineBoxOutlined />, tone: 'pink' },
  { label: 'Play Area', icon: <SmileOutlined />, tone: 'teal' },
  { label: 'CCTV Secured', icon: <VideoCameraOutlined />, tone: 'pink' },
];

const OFFERS = [
  { label: 'Pet Salon and Pampering Services', icon: <ScissorOutlined />, img: offer1, tone: 'teal' },
  { label: 'Home Service Grooming', icon: <HomeOutlined />, img: offer2, tone: 'pink' },
  { label: 'Pet Transport', icon: <CarOutlined />, img: offer3, tone: 'teal' },
  { label: 'Pet Merchandise', icon: <ShoppingOutlined />, img: offer4, tone: 'pink' },
  { label: 'Snack Bar', icon: <CoffeeOutlined />, img: offer5, tone: 'teal' },
];

function PawMark() {
  return (
    <svg className="about-paw" viewBox="0 0 64 64" aria-hidden="true">
      <ellipse cx="32" cy="42" rx="14" ry="12" />
      <ellipse cx="12" cy="28" rx="6" ry="8" transform="rotate(-20 12 28)" />
      <ellipse cx="24" cy="15" rx="6" ry="9" transform="rotate(-8 24 15)" />
      <ellipse cx="40" cy="15" rx="6" ry="9" transform="rotate(8 40 15)" />
      <ellipse cx="52" cy="28" rx="6" ry="8" transform="rotate(20 52 28)" />
    </svg>
  );
}

function SectionTitle({ children, sub }) {
  return (
    <div className="about-section-head">
      <h2><PawMark />{children}<PawMark /></h2>
      <p>{sub}</p>
    </div>
  );
}

function AboutUs() {
  return (
    <div className="about-page">
      <SiteHeader />

      <main>
        <section className="about-intro">
          <h1>About Us</h1>
          <p>
          At My Pet Space, we believe every pet deserves a safe, comfortable, and loving home away from home. Our dedicated team provides exceptional care, cozy accommodations, and personalized attention to ensure your furry family members feel happy and secure during their stay. Whether it's for a day, a weekend, or an extended vacation, we treat every pet as if they were our own.
          Our facility is designed with your pet's well-being in mind, offering clean and spacious accommodations, supervised playtime, and a stress-free environment where they can relax, socialize, and feel at ease. We understand that every pet has unique needs and personality traits, which is why we tailor our care to provide the best possible experience for each guest.
          At My Pet Space, our mission is to give pet owners peace of mind while they're away, knowing their beloved companions are receiving the highest level of care, affection, and attention. From daily exercise and feeding routines to plenty of cuddles and companionship, we strive to make every stay enjoyable, memorable, and filled with love. Your pet's happiness, comfort, and safety are always our top priorities.
          </p>
        </section>

        <section className="about-facilities">
          <SectionTitle sub="Everything your pet needs is here">Our Facilities</SectionTitle>
          <div className="facility-grid">
            {FACILITIES.map((f) => (
              <div key={f.label} className={`facility-card ${f.tone}`}>
                {f.icon}
                <span>{f.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="about-offers">
          <SectionTitle sub="Everything your pet needs is here">Explore Our Offers</SectionTitle>
          <div className="offer-grid">
            {OFFERS.map((o) => (
              <div key={o.label} className={`offer-card ${o.tone}`}>
                <div className="offer-photo">
                  <img src={o.img} alt={o.label} />
                </div>
                <span className="offer-badge">{o.icon}</span>
                <span className="offer-label">{o.label}</span>
              </div>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

export default AboutUs;