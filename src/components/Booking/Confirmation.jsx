import { useEffect, useState } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Alert, Modal, Spin } from 'antd';
import { API_URL } from '../../auth';
import BookingStep from './BookingStep';
import './Booking.css';
import { findRoom, hourLabel, stayTotal } from '../../data/roomOptions';

// What the earlier steps remembered:
//   booking:<type>:pet       -> chosen pet's _id
//   booking:<type>:services  -> JSON array of service names
//   booking:<type>:schedule  -> JSON { date: "YYYY-MM-DD", time: "09:00", label: "9:00 am" }
const key = (type, name) => `booking:${type}:${name}`;
const NAMES = ['pet', 'services', 'schedule'];

const readSaved = (k) => {
  try {
    return sessionStorage.getItem(k);
  } catch (err) {
    return null;
  }
};
const readJson = (k) => {
  try {
    return JSON.parse(readSaved(k));
  } catch (err) {
    return null;
  }
};
// after a booking is saved, the next booking starts from a clean slate
const clearBooking = (type) => {
  try {
    NAMES.forEach((n) => sessionStorage.removeItem(key(type, n)));
  } catch (err) {
    /* ignore */
  }
};

// how each saved service name is shown to the customer
const SERVICE_LABELS = {
  'Bath-Dry': 'Bath & Dry',
  'Tear Strain': 'Tear Strain',
  'Eye Cleaning': 'Eye Cleaning',
  'Nail Trimming': 'Nail Trimming',
  'Ear Cleaning': 'Ear Cleaning',
  Dematting: 'Dematting',
  'Basic Groom': 'Basic Groom Package',
  'Full Groom': 'Full Groom Package',
  'Groom & Massage': 'Groom and Massage Package',
};

const PawIcon = () => (
  <svg viewBox="0 0 64 64" fill="currentColor" aria-hidden="true">
    <ellipse cx="13" cy="30" rx="6" ry="8" transform="rotate(-20 13 30)" />
    <ellipse cx="25" cy="16" rx="6.5" ry="9" transform="rotate(-8 25 16)" />
    <ellipse cx="41" cy="16" rx="6.5" ry="9" transform="rotate(8 41 16)" />
    <ellipse cx="53" cy="30" rx="6" ry="8" transform="rotate(20 53 30)" />
    <path d="M32 29c-9 0-18 10-18 19 0 7 6 10 11 9 3-1 5-2 7-2s4 1 7 2c5 1 11-2 11-9 0-9-9-19-18-19z" />
  </svg>
);

function GroomingConfirmation({ type }) {
  const navigate = useNavigate();

  // read once, so clearing the saved choices after booking doesn't redirect this page
  const [draft] = useState(() => {
    const services = readJson(key(type, 'services'));
    const schedule = readJson(key(type, 'schedule'));
    return {
      petId: readSaved(key(type, 'pet')),
      services: Array.isArray(services) ? services : [],
      schedule: schedule && schedule.date && schedule.time ? schedule : null,
    };
  });

  const [pet, setPet] = useState(null);
  const [petError, setPetError] = useState('');
  const [groomer, setGroomer] = useState(null); // { id, name }
  const [slotError, setSlotError] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [booked, setBooked] = useState(false); // true = show the "Booking Confirmed" pop-up

  const complete = !!draft.petId && draft.services.length > 0 && !!draft.schedule;

  // the pet chosen in step 1 (from the user's registered pets)
  useEffect(() => {
    if (!complete) return undefined;
    let active = true;
    axios
      .get(`${API_URL}/pets`)
      .then(({ data }) => {
        if (!active) return;
        const found = data.pets.find((p) => p._id === draft.petId);
        if (found) setPet(found);
        else setPetError('We could not find that pet. Please choose your pet again.');
      })
      .catch((err) => {
        if (active) setPetError(err.response?.data?.message || 'Could not load your pet. Please try again.');
      });
    return () => {
      active = false;
    };
  }, [complete, draft.petId]);

  // the groomer who would get this time slot
  useEffect(() => {
    if (!complete) return undefined;
    let active = true;
    axios
      .get(`${API_URL}/appointments/assignment`, { params: { date: draft.schedule.date, time: draft.schedule.time } })
      .then(({ data }) => {
        if (active) setGroomer(data.groomer);
      })
      .catch((err) => {
        if (active) setSlotError(err.response?.data?.message || 'Could not check the time slot. Please try again.');
      });
    return () => {
      active = false;
    };
  }, [complete, draft.schedule]);

  // the earlier steps must be done first
  if (!draft.petId) return <Navigate to={`/book/${type}/pet-details`} replace />;
  if (draft.services.length === 0) return <Navigate to={`/book/${type}/services`} replace />;
  if (!draft.schedule) return <Navigate to={`/book/${type}/schedule`} replace />;

  const ready = !!pet && !!groomer && !slotError;

  const onConfirm = async () => {
    setSubmitting(true);
    setSubmitError('');
    try {
      await axios.post(`${API_URL}/appointments`, {
        petId: draft.petId,
        services: draft.services,
        date: draft.schedule.date,
        time: draft.schedule.time,
        groomerId: groomer.id,
      });
      clearBooking(type);
      setBooked(true);
    } catch (err) {
      const message = err.response?.data?.message || 'Could not reach the server. Please try again.';
      if (err.response?.status === 409) {
        setGroomer(null);
        setSlotError(message); // the slot was taken while the customer was confirming
      } else {
        setSubmitError(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const rows = [
    ['Pet', pet ? `${pet.name} (${pet.breed})` : '...'],
    ['Service', draft.services.map((n) => SERVICE_LABELS[n] || n).join(', ')],
    ['Date', dayjs(draft.schedule.date).format('MMMM D, YYYY')],
    ['Time', String(draft.schedule.label || draft.schedule.time).toUpperCase()],
    ['Groomer', groomer ? groomer.name : slotError ? '-' : '...'],
  ];

  return (
    <BookingStep
      step="confirmation"
      title="Book an Appointment"
      subtitle="Select your preferred date, time, and groomer"
      customNext={
        <button type="button" className="btn cf-confirm" disabled={!ready || !agreed || submitting} onClick={onConfirm}>
          {submitting ? 'Confirming...' : 'Confirm'}
        </button>
      }
    >
      {petError && <Alert type="error" showIcon title={petError} className="cf-alert" action={<Link to={`/book/${type}/pet-details`}>Choose a pet</Link>} />}
      {slotError && <Alert type="error" showIcon title={slotError} className="cf-alert" action={<Link to={`/book/${type}/schedule`}>Choose another time</Link>} />}
      {submitError && <Alert type="error" showIcon title={submitError} className="cf-alert" />}

      <section className="cf-card cf-room" aria-label="Booking summary">
        <header className="cf-head">
          <h2 className="cf-title">Booking Summary</h2>
        </header>

        <div className="cf-body">
          <div className="cf-left">
            <dl className="cf-rows">
              {rows.map(([label, value]) => (
                <div key={label} className="cf-row">
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="cf-right">
            {pet ? (
              <>
                <div className="cf-photo">{pet.photo ? <img src={pet.photo} alt={pet.name} /> : <PawIcon />}</div>
                <h3 className="cf-pet-name">{pet.name}</h3>
                <p className="cf-pet-breed">{pet.breed}</p>
              </>
            ) : (
              !petError && <div className="cf-loading"><Spin /></div>
            )}
          </div>
        </div>
      </section>

      <label className="cf-check">
        <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
        <span>I confirm that the appointment details are correct.</span>
      </label>

      {/* after confirming: go home, or book again */}
      <Modal
        open={booked}
        centered
        closable={false}
        maskClosable={false}
        keyboard={false}
        title="Booking Confirmed"
        footer={
          <div className="cf-modal-actions">
            <button type="button" className="btn btn-outline-teal" onClick={() => navigate('/')}>Back to Home</button>
            <button type="button" className="btn btn-pink" onClick={() => navigate(`/book/${type}/pet-details`)}>Book Another</button>
          </div>
        }
      >
        <p className="cf-modal-text">
          {pet ? `${pet.name}'s` : 'Your'} grooming appointment on {dayjs(draft.schedule.date).format('MMMM D, YYYY')} at{' '}
          {String(draft.schedule.label || draft.schedule.time).toUpperCase()} has been booked. Would you like to book
          another appointment?
        </p>
      </Modal>
    </BookingStep>
  );
}

// ---------- room booking ----------
// What the earlier steps remembered: pet, room, dates, time, hours (Day Boarding), slot.
// This step only shows the summary: Confirm goes on to the Payment step, which saves the booking.

function RoomConfirmation({ type }) {
  const navigate = useNavigate();

  const [draft] = useState(() => {
    const dates = readJson(key(type, 'dates'));
    return {
      petId: readSaved(key(type, 'pet')),
      room: findRoom(readSaved(key(type, 'room'))),
      dates: dates && dates.start && dates.end ? dates : null,
      time: readSaved(key(type, 'time')),
      outTime: readSaved(key(type, 'outTime')),
      hours: Number(readSaved(key(type, 'hours'))) || null,
      slot: Number(readSaved(key(type, 'slot'))) || null,
    };
  });

  const [pet, setPet] = useState(null);
  const [petError, setPetError] = useState('');
  const [agreed, setAgreed] = useState(false);

    const complete = !!draft.petId && !!draft.room && !!draft.dates && !!draft.time && !!draft.outTime && !!draft.slot;

  useEffect(() => {
    if (!complete) return undefined;
    let active = true;
    axios
      .get(`${API_URL}/pets`)
      .then(({ data }) => {
        if (!active) return;
        const found = data.pets.find((p) => p._id === draft.petId);
        if (found) setPet(found);
        else setPetError('We could not find that pet. Please choose your pet again.');
      })
      .catch((err) => {
        if (active) setPetError(err.response?.data?.message || 'Could not load your pet. Please try again.');
      });
    return () => {
      active = false;
    };
  }, [complete, draft.petId]);

  // the earlier steps must be done first
  if (!draft.petId) return <Navigate to={`/book/${type}/pet-details`} replace />;
  if (!draft.room || !draft.dates) return <Navigate to={`/book/${type}/services`} replace />;
  if (!draft.time || !draft.outTime || !draft.slot) return <Navigate to={`/book/${type}/services`} replace />;

  const { room, dates } = draft;
  const isDay = room.kind === 'day';
  const nights = dayjs(dates.end).diff(dayjs(dates.start), 'day');
  const startHour = Number(draft.time.slice(0, 2));
  const endHour = Number(draft.outTime.slice(0, 2));
  const total = stayTotal(room, nights, endHour - startHour);
  const dateText = isDay
    ? dayjs(dates.start).format('MMMM D, YYYY')
    : `${dayjs(dates.start).format('MMMM D')} - ${dayjs(dates.end).format('MMMM D, YYYY')} (${nights} ${nights === 1 ? 'night' : 'nights'})`;
  const timeText = isDay
    ? `${hourLabel(startHour)} - ${hourLabel(endHour)} (${endHour - startHour} hours)`
    : `Check-in ${hourLabel(startHour)}, check-out ${hourLabel(endHour)}`;
  const onConfirm = () => navigate(`/book/${type}/payment`);

  const rows = [
    ['Pet', pet ? `${pet.name} (${pet.breed})` : '...'],
    ['Room', room.name],
    ['Slot', `Slot ${draft.slot}`],
    ['Date', dateText],
    ['Time', timeText],
    ['Total', total === null ? 'Surcharge: confirmed by the shop' : `₱${total.toLocaleString()}`],
  ];

  return (
    <BookingStep
      step="confirmation"
      title="Book a Room"
      subtitle="Choose the perfect room for your fur babies."
      customNext={
        <button type="button" className="btn cf-confirm" disabled={!pet || !agreed} onClick={onConfirm}>
          Confirm
        </button>
      }
    >
      {petError && <Alert type="error" showIcon title={petError} className="cf-alert" action={<Link to={`/book/${type}/pet-details`}>Choose a pet</Link>} />}

      <section className="cf-card cf-room" aria-label="Booking summary">
        <header className="cf-head">
          <h2 className="cf-title">Booking Summary</h2>
        </header>

        <div className="cf-body">
          <div className="cf-left">
            <dl className="cf-rows">
              {rows.map(([label, value]) => (
                <div key={label} className="cf-row">
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="cf-right">
            <div className="cf-photo"><img src={room.img} alt={room.name} /></div>
            <h3 className="cf-pet-name">{room.name}</h3>
            {room.sub && <p className="cf-pet-breed">{room.sub}</p>}
          </div>
        </div>
      </section>

      <label className="cf-check">
        <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
        <span>I confirm that the booking details are correct.</span>
      </label>
    </BookingStep>
  );
}

function Confirmation() {
  const { type } = useParams();

  // grooming and room bookings both have a real page now
  if (type === 'grooming') return <GroomingConfirmation type={type} />;
  if (type === 'room') return <RoomConfirmation type={type} />;

  return (
    <BookingStep
      step="confirmation"
      title="Confirmation of Booking"
      planned={[
        'Summary of pet, services, schedule and total',
        'Amount due now (hotel: 50% deposit, grooming: full amount)',
        'Booking starts as Pending until payment is verified',
      ]}
    />
  );
}

export default Confirmation;