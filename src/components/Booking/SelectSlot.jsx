import { useEffect, useState } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import { Navigate, useParams } from 'react-router-dom';
import { Alert, Select, Spin } from 'antd';
import { API_URL } from '../../auth';
import BookingStep from './BookingStep';
import {
  CLOSE_HOUR,
  MAX_DAY_HOURS,
  MIN_DAY_HOURS,
  checkInHours,
  findRoom,
  hourLabel,
  stayTotal,
  timeValue,
} from '../../data/roomOptions';
import './Booking.css';

// Step 3 of a room booking: pick a check-in time, then one free slot (square) of the room type.
// What the earlier steps saved:   booking:room:pet / :room / :dates
// What this step saves:           booking:room:time  ("09:00")
//                                 booking:room:hours (Day Boarding only, e.g. "4")
//                                 booking:room:slot  ("3")
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
    if (value === null || value === undefined || value === '') sessionStorage.removeItem(k);
    else sessionStorage.setItem(k, String(value));
  } catch (err) {
    /* storage unavailable: the choice just won't be remembered */
  }
};
const readDates = (type) => {
  try {
    const d = JSON.parse(readSaved(key(type, 'dates')));
    return d && d.start && d.end ? d : null;
  } catch (err) {
    return null;
  }
};

function SelectSlot() {
  const { type } = useParams();
  const room = findRoom(readSaved(key(type, 'room')));
  const dates = readDates(type);
  const isDay = !!room && room.kind === 'day';

  const [time, setTime] = useState(() => readSaved(key(type, 'time')) || null); // "09:00"
  const [hours, setHours] = useState(() => Number(readSaved(key(type, 'hours'))) || MIN_DAY_HOURS);
  const [slot, setSlot] = useState(() => Number(readSaved(key(type, 'slot'))) || null);
  const [slots, setSlots] = useState(null); // null = loading, otherwise [{ slot, taken }]
  const [error, setError] = useState('');

  const start = dates ? dates.start : null;
  const end = dates ? dates.end : null;
  const roomId = room ? room.id : null;
  const timeHour = time ? Number(time.slice(0, 2)) : null;

  // Day Boarding: the slot you see depends on the hours you pick, so it waits for the time.
  // Overnight rooms: a slot is taken for the nights, so it can be shown straight away.
  const needsTime = isDay;
  const canLoad = !!roomId && !!start && !!end && (!needsTime || !!time);

  useEffect(() => {
    if (!canLoad) {
      setSlots(null);
      return undefined;
    }
    let active = true;
    setSlots(null);
    setError('');
    axios
      .get(`${API_URL}/rooms/slots`, { params: { roomId, start, end, time: needsTime ? time : undefined, hours: needsTime ? hours : undefined } })
      .then(({ data }) => {
        if (!active) return;
        setSlots(data.slots);
        // a slot that has been taken since is un-selected
        setSlot((old) => (old && data.slots.some((s) => s.slot === old && !s.taken) ? old : null));
      })
      .catch((err) => {
        if (!active) return;
        setSlots([]);
        setSlot(null);
        setError(err.response?.data?.message || 'Could not load the slots. Please try again.');
      });
    return () => {
      active = false;
    };
  }, [canLoad, roomId, start, end, time, hours, needsTime]);

  // remember the choices for the next step
  useEffect(() => {
    writeSaved(key(type, 'time'), time);
    writeSaved(key(type, 'hours'), isDay ? hours : null);
    writeSaved(key(type, 'slot'), slot);
  }, [type, time, hours, slot, isDay]);

  // the earlier steps must be done first
  if (!readSaved(key(type, 'pet'))) return <Navigate to={`/book/${type}/pet-details`} replace />;
  if (!room || !dates) return <Navigate to={`/book/${type}/services`} replace />;

  const free = slots ? slots.filter((s) => !s.taken).length : null;
  const nights = dayjs(end).diff(dayjs(start), 'day');
  const total = stayTotal(room, nights, hours);
  const stayText = start === end ? dayjs(start).format('MMM D, YYYY') : `${dayjs(start).format('MMM D')} - ${dayjs(end).format('MMM D, YYYY')}`;

  // a time that has already passed today can't be chosen
  const isPast = (h) => dayjs(`${start}T${timeValue(h)}`).isBefore(dayjs());
  const hourOptions = Array.from({ length: MAX_DAY_HOURS - MIN_DAY_HOURS + 1 }, (_, i) => MIN_DAY_HOURS + i);
  const endHour = timeHour !== null ? timeHour + hours : null;
  const tooLong = isDay && endHour !== null && endHour > CLOSE_HOUR;

  const onTime = (h) => {
    setTime(timeValue(h));
    setSlot(null);
  };
  const onHours = (n) => {
    setHours(n);
    setSlot(null);
  };

  const canNext = !!time && !!slot && !tooLong && !error;

  return (
    <BookingStep
      step="slot"
      title="Book a Room"
      subtitle="Choose the perfect room for your fur babies."
      canNext={canNext}
    >
      <section className="rt-panel sl-panel">
        <div className="sl-head">
          <img src={room.img} alt="" />
          <div>
            <h2>{room.name}</h2>
            <p>{stayText}{!isDay && ` (${nights} ${nights === 1 ? 'night' : 'nights'})`} - up to {room.maxPets} pets</p>
          </div>
        </div>

        <h3 className="sl-title">{isDay ? 'Start time' : 'Check-in time'}</h3>
        <div className="sl-times" role="group" aria-label={isDay ? 'Start time' : 'Check-in time'}>
          {checkInHours(room).map((h) => {
            const past = isPast(h);
            const on = time === timeValue(h);
            return (
              <button
                key={h}
                type="button"
                className={`sl-time${on ? ' is-on' : ''}`}
                aria-pressed={on}
                disabled={past}
                onClick={() => onTime(h)}
              >
                {hourLabel(h)}
              </button>
            );
          })}
        </div>

        {isDay && (
          <div className="sl-hours">
            <label htmlFor="sl-hours">How many hours?</label>
            <Select
              id="sl-hours"
              className="sl-select"
              value={hours}
              onChange={onHours}
              options={hourOptions.map((n) => ({ value: n, label: `${n} hours` }))}
            />
            {timeHour !== null && (
              <span className={tooLong ? 'sl-warn' : ''}>
                {tooLong
                  ? `That would end after ${hourLabel(CLOSE_HOUR)}. Choose an earlier start or fewer hours.`
                  : `Pick-up by ${hourLabel(endHour)}`}
              </span>
            )}
          </div>
        )}

        <h3 className="sl-title">Choose a slot</h3>
        {error && <Alert type="error" showIcon title={error} className="bk-alert" />}

        {slots === null && canLoad ? (
          <div className="sl-wait"><Spin /></div>
        ) : !canLoad ? (
          <p className="sl-hint">Choose a start time to see the open slots.</p>
        ) : (
          <>
            <div className="sl-grid" role="group" aria-label="Slots">
              {slots.map((s) => {
                const on = slot === s.slot;
                return (
                  <button
                    key={s.slot}
                    type="button"
                    className={`sl-square${on ? ' is-on' : ''}${s.taken ? ' is-taken' : ''}`}
                    aria-pressed={on}
                    disabled={s.taken}
                    onClick={() => setSlot(on ? null : s.slot)}
                  >
                    <b>{s.slot}</b>
                    <span>{s.taken ? 'Booked' : 'Open'}</span>
                  </button>
                );
              })}
            </div>
            <p className="sl-legend">
              {free === 0
                ? 'This room is fully booked for these dates. Please go back and choose another room or date.'
                : `${free} of ${room.maxPets} slots open. Grey squares are already booked.`}
            </p>
          </>
        )}

        <p className="rt-foot" aria-live="polite">
          {total !== null && (
            <>
              {slot ? <>Slot <b>{slot}</b> - </> : null}
              {time ? <><b>{hourLabel(Number(time.slice(0, 2)))}</b> - </> : null}
              {isDay ? 'total ' : 'from '}<b>₱{total.toLocaleString()}</b>
            </>
          )}
        </p>
      </section>
    </BookingStep>
  );
}

export default SelectSlot;