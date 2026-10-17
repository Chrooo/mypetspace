import { useEffect, useState } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import { Navigate, useParams } from 'react-router-dom';
import { Alert, DatePicker, Spin } from 'antd';
import { API_URL } from '../../auth';
import BookingStep from './BookingStep';
import './Booking.css';

const MAX_DAYS_AHEAD = 30; // the bookable window: today up to 30 days from now
const DAY = 24 * 60 * 60 * 1000;

// What the earlier steps remembered, and what this step saves for the next one:
//   booking:<type>:pet       -> chosen pet's _id                       (step 1)
//   booking:<type>:services  -> JSON array of service names            (step 2)
//   booking:<type>:schedule  -> JSON { date: "YYYY-MM-DD", time: "09:00", label: "9:00 am" }  (this step)
const key = (type, name) => `booking:${type}:${name}`;

const readSaved = (k) => {
  try {
    return sessionStorage.getItem(k);
  } catch (err) {
    return null;
  }
};
const writeSaved = (k, value) => {
  try {
    sessionStorage.setItem(k, value);
  } catch (err) {
    /* storage unavailable: the choice just won't be remembered */
  }
};
const removeSaved = (k) => {
  try {
    sessionStorage.removeItem(k);
  } catch (err) {
    /* ignore */
  }
};
const readSchedule = (type) => {
  try {
    const s = JSON.parse(readSaved(key(type, 'schedule')));
    return s && /^\d{4}-\d{2}-\d{2}$/.test(s.date) && s.time ? s : null;
  } catch (err) {
    return null;
  }
};

// only today up to MAX_DAYS_AHEAD days from now can be picked
const disabledDate = (current) =>
  !!current &&
  (current.endOf('day').valueOf() < Date.now() || current.startOf('day').valueOf() > Date.now() + MAX_DAYS_AHEAD * DAY);

function GroomingSchedule({ type }) {
  const saved = readSchedule(type);
  const [date, setDate] = useState(saved ? saved.date : null); // "YYYY-MM-DD"
  const [time, setTime] = useState(saved ? saved.time : null); // "09:00"
  const [slots, setSlots] = useState(null); // null = nothing loaded yet
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // load the slots of the chosen date (each slot says whether it is full)
  useEffect(() => {
    if (!date) {
      setSlots(null);
      return undefined;
    }
    let active = true;
    setLoading(true);
    setError('');
    axios
      .get(`${API_URL}/appointments/availability`, { params: { date } })
      .then(({ data }) => {
        if (!active) return;
        setSlots(data.slots);
        // a remembered time that has since filled up (or passed) is un-selected
        setTime((old) => (old && data.slots.some((s) => s.time === old && !s.full && !s.past) ? old : null));
      })
      .catch((err) => {
        if (!active) return;
        setSlots(null);
        setTime(null);
        setError(err.response?.data?.message || 'Could not load the time slots. Please try again.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [date]);

  // remember the choice for the next step
  useEffect(() => {
    if (!date || slots === null) return;
    const slot = slots.find((s) => s.time === time);
    if (slot) writeSaved(key(type, 'schedule'), JSON.stringify({ date, time, label: slot.label }));
    else removeSaved(key(type, 'schedule'));
  }, [type, date, time, slots]);

  // steps 1 and 2 must be done first
  if (!readSaved(key(type, 'pet'))) return <Navigate to={`/book/${type}/pet-details`} replace />;
  if (!readSaved(key(type, 'services'))) return <Navigate to={`/book/${type}/services`} replace />;

  const onDateChange = (value) => {
    setDate(value ? value.format('YYYY-MM-DD') : null);
    setTime(null); // a new date means a new choice of time
    setSlots(null);
    removeSaved(key(type, 'schedule'));
  };

  const allClosed = slots !== null && slots.every((s) => s.full || s.past);

  return (
    <BookingStep
      step="schedule"
      title="Book an Appointment"
      subtitle="Select your preferred date, time, and groomer"
      canNext={!!date && !!time}
    >
      <section className="sc-card">
        <div className="sc-col">
          <h2 className="sc-title"><label htmlFor="sc-date">Select Date</label></h2>
          <DatePicker
            id="sc-date"
            className="sc-date"
            placeholder="Select Date"
            format="MMM D, YYYY"
            value={date ? dayjs(date) : null}
            onChange={onDateChange}
            disabledDate={disabledDate}
            allowClear={false}
            inputReadOnly
          />
          <p className="sc-hint">You can book from today up to {MAX_DAYS_AHEAD} days ahead.</p>
        </div>

        <div className="sc-col sc-right">
          <h2 className="sc-title">Available Slots</h2>

          {error && <Alert type="error" showIcon title={error} />}

          {!date && !error && <p className="sc-empty">Select a date to see the available time slots.</p>}

          {date && loading && <div className="sc-empty"><Spin /></div>}

          {date && !loading && slots && (
            <>
              <div className="sc-slots" role="group" aria-label="Available time slots">
                {slots.map((s) => {
                  const off = s.full || s.past;
                  const on = time === s.time;
                  return (
                    <button
                      key={s.time}
                      type="button"
                      className={`sc-slot${on ? ' is-on' : ''}`}
                      disabled={off}
                      aria-pressed={on}
                      title={s.full ? 'Fully booked' : s.past ? 'This time has already passed' : undefined}
                      onClick={() => setTime(s.time)}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
              <p className="sc-hint">
                {allClosed
                  ? 'No slots are left on this date. Please pick another date.'
                  : ' Please pick your preferred time. Gray slots are already full.'}
              </p>
            </>
          )}
        </div>
      </section>
    </BookingStep>
  );
}

function SelectSchedule() {
  const { type } = useParams();

  // grooming gets the real page; the hotel check-in and check-out dates stay a placeholder until they are built
  if (type === 'grooming') return <GroomingSchedule type={type} />;

  return (
    <BookingStep
      step="schedule"
      title="Select Time and Date"
      planned={[
        'Grooming: date, available time slot and groomer',
        'Hotel: check-in and check-out dates (available rooms only)',
      ]}
    />
  );
}

export default SelectSchedule;