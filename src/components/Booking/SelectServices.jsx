import { useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import BookingStep from './BookingStep';
import './Booking.css';

// "name" is what gets saved with the appointment (same names the groomer pages use);
// "label" is what the customer sees in the tile.
const INDIVIDUAL = [
  { name: 'Bath-Dry', label: 'Bath & Dry', min: 200, max: 200 },
  { name: 'Tear Strain', label: 'Tear Strain', min: 100, max: 100 },
  { name: 'Eye Cleaning', label: 'Eye Cleaning', min: 100, max: 100 },
  { name: 'Nail Trimming', label: 'Nail Trimming', min: 100, max: 100 },
  { name: 'Ear Cleaning', label: 'Ear Cleaning', min: 100, max: 100 },
  { name: 'Dematting', label: 'Dematting', min: 300, max: 300 },
];

const PACKAGES = [
  { name: 'Basic Groom', label: 'Basic Groom Package', min: 300, max: 600 },
  { name: 'Full Groom', label: 'Full Groom Package', min: 400, max: 800 },
  { name: 'Groom & Massage', label: 'Groom & Massage Package', min: 600, max: 1000 },
];

const ALL = [...INDIVIDUAL, ...PACKAGES];
const PACKAGE_NAMES = PACKAGES.map((p) => p.name);

const peso = (n) => `₱${n}`;
const priceText = ({ min, max }) => (min === max ? peso(min) : `${peso(min)}-${max}`);

// What step 1 and step 2 remember for the next steps:
//   booking:<type>:pet       -> the chosen pet's _id            (saved by PetDetails)
//   booking:<type>:services  -> JSON array of service names     (saved here)
const petKey = (type) => `booking:${type}:pet`;
const servicesKey = (type) => `booking:${type}:services`;

const readSaved = (key) => {
  try {
    return sessionStorage.getItem(key);
  } catch (err) {
    return null;
  }
};
const writeSaved = (key, value) => {
  try {
    sessionStorage.setItem(key, value);
  } catch (err) {
    /* storage unavailable: the choice just won't be remembered */
  }
};
const readServices = (type) => {
  try {
    const list = JSON.parse(readSaved(servicesKey(type)));
    return Array.isArray(list) ? list.filter((n) => ALL.some((s) => s.name === n)) : [];
  } catch (err) {
    return [];
  }
};

function GroomingServices({ type }) {
  const [picked, setPicked] = useState(() => readServices(type));

  // a pet must be chosen in step 1 first
  if (!readSaved(petKey(type))) return <Navigate to={`/book/${type}/pet-details`} replace />;

  // Pick any individual services, or one package (choosing a package replaces the previous package).
  const toggle = (name) => {
    let next;
    if (picked.includes(name)) next = picked.filter((n) => n !== name);
    else if (PACKAGE_NAMES.includes(name)) next = [...picked.filter((n) => !PACKAGE_NAMES.includes(n)), name];
    else next = [...picked, name];
    setPicked(next);
    writeSaved(servicesKey(type), JSON.stringify(next));
  };

  const chosen = ALL.filter((s) => picked.includes(s.name));
  const total = chosen.reduce((sum, s) => ({ min: sum.min + s.min, max: sum.max + s.max }), { min: 0, max: 0 });

  return (
    <BookingStep
      step="services"
      title="Book an Appointment"
      subtitle="Select your preferred date, time, and groomer"
      canNext={chosen.length > 0}
    >
      <section className="sv-card">
        <h2 className="sv-title">Services and Packages</h2>

        <div className="sv-grid" role="group" aria-label="Services and packages">
          {ALL.map((item) => {
            const on = picked.includes(item.name);
            return (
              <button
                key={item.name}
                type="button"
                className={`sv-tile${on ? ' is-on' : ''}`}
                aria-pressed={on}
                onClick={() => toggle(item.name)}
              >
                <span>{item.label}</span>
                <b>{priceText(item)}</b>
              </button>
            );
          })}
        </div>

        <div className="sv-foot" aria-live="polite">
          <span>
            {chosen.length === 0
              ? 'Choose one or more services, or a package.'
              : `${chosen.length} selected, total ${priceText(total)}`}
          </span>
          <small>Prices may vary depending on the pet&apos;s size and kg.</small>
        </div>
      </section>
    </BookingStep>
  );
}

function SelectServices() {
  const { type } = useParams();

  // grooming gets the real page; the room booking keeps its placeholder until it is built
  if (type === 'grooming') return <GroomingServices type={type} />;

  return (
    <BookingStep
      step="services"
      title="Select Services"
      planned={[
        'Grooming: choose services or a package',
        'Hotel: choose a room type and number of nights',
        'Running price total',
      ]}
    />
  );
}

export default SelectServices;