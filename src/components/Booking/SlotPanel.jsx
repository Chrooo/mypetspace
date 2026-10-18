import { useEffect, useState } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import { Alert, Spin } from 'antd';
import { LeftOutlined } from '@ant-design/icons';
import { API_URL } from '../../auth';
import { CHOICE_HOURS, MIN_DAY_HOURS, hourLabel, timeValue } from '../../data/roomOptions';
import './Booking.css';

// The "SLOTS" section of the Room Type step. It replaces the list of rooms once a room is clicked
// (it is part of the same step, not a pop-up and not an extra step).
//   room     -> the room type (from data/roomOptions.js)
//   dates    -> { start: "YYYY-MM-DD", end: "YYYY-MM-DD" } chosen on the page
//   initial  -> { time, outTime, slot } remembered from an earlier visit (or null)
//   onBack   -> called to go back to the list of rooms without confirming
//   onConfirm({ time, outTime, hours, slot }) -> called with the choices
function SlotPanel({ room, dates, initial, onBack, onConfirm }) {
  const isDay = room.kind === 'day';
  const [time, setTime] = useState(initial?.time || null); // check-in "HH:00"
  const [outTime, setOutTime] = useState(initial?.outTime || null); // check-out "HH:00"
  const [slot, setSlot] = useState(initial?.slot || null);
  const [slots, setSlots] = useState(null); // null = not loaded, otherwise [{ slot, taken }]
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const inHour = time ? Number(time.slice(0, 2)) : null;
  const outHour = outTime ? Number(outTime.slice(0, 2)) : null;
  const hours = isDay && inHour !== null && outHour !== null ? outHour - inHour : null;

  // Day Boarding: a check-out must leave at least 3 hours. Overnight rooms: any time on the last day.
  const outOk = (h) => (isDay ? inHour !== null && h - inHour >= MIN_DAY_HOURS : true);
  const inPast = (h) => dayjs(`${dates.start}T${timeValue(h)}`).isBefore(dayjs());

  // a check-out that no longer fits (after changing the check-in) is un-selected
  useEffect(() => {
    if (outHour !== null && !outOk(outHour)) {
      setOutTime(null);
      setSlot(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inHour]);

  // Day Boarding needs both times first (the same slot can be booked again at another hour).
  // Overnight rooms: a slot is taken for whole nights, so the squares show straight away.
  const ready = !isDay || (!!time && !!outTime);
  useEffect(() => {
    if (!ready) {
      setSlots(null);
      return undefined;
    }
    let active = true;
    setLoading(true);
    setError('');
    axios
      .get(`${API_URL}/rooms/slots`, {
        params: { roomId: room.id, start: dates.start, end: dates.end, time: isDay ? time : undefined, outTime: isDay ? outTime : undefined },
      })
      .then(({ data }) => {
        if (!active) return;
        setSlots(data.slots);
        setSlot((old) => (old && data.slots.some((s) => s.slot === old && !s.taken) ? old : null)); // taken since = un-selected
      })
      .catch((err) => {
        if (!active) return;
        setSlots([]);
        setSlot(null);
        setError(err.response?.data?.message || 'Could not load the slots. Please try again.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [ready, room.id, dates.start, dates.end, isDay, time, outTime]);

  const pickIn = (h) => {
    setTime(timeValue(h));
    setSlot(null);
  };
  const pickOut = (h) => {
    setOutTime(timeValue(h));
    setSlot(null);
  };

  const canConfirm = !!time && !!outTime && !!slot && !error;
  const fmt = (date, h) => `${dayjs(date).format('MMMM D, YYYY')} ${hourLabel(h)}`;
  const dateText = dates.start === dates.end
    ? dayjs(dates.start).format('MMM D')
    : `${dayjs(dates.start).format('MMM D')} - ${dayjs(dates.end).format('MMM D')}`;

  return (
    <section className="sp-card" aria-label={`Slots for ${room.name}`}>
      <div className="sp-left">
        <div className="sp-head">
          <img src={room.img} alt={room.name} className="sp-img" />
          <div>
            <h2 className="sp-name">{room.name}</h2>
            {room.sub && <p className="sp-sub">{room.sub}</p>}
            <p className="sp-price">{room.price !== null ? `₱${room.price.toLocaleString()}` : 'Surcharge applies'}</p>
            <p className="sp-price-note">{room.priceText}</p>
          </div>
        </div>
        <p className="sp-desc">{room.desc}</p>
        <h3 className="sp-amen-title">Amenities and Services:</h3>
        <ul className="sp-amen">
          {room.amenities.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
        <p className="sp-max">{room.maxPets} pets max per room type</p>
      </div>

      <div className="sp-right">
        <h2 className="sp-title">SLOTS</h2>

        <div className="sp-top">
          <b>Room: {room.name}</b>
          <b>Date: {dateText}</b>
        </div>
        <p className="sp-note">Choose your preferred check-in and check-out time.</p>

        <h3 className="sp-h">Check-in</h3>
        <div className="sp-times" role="group" aria-label="Check-in time">
          {CHOICE_HOURS.map((h) => (
            <button
              key={h}
              type="button"
              className={`sp-time${time === timeValue(h) ? ' is-on' : ''}`}
              aria-pressed={time === timeValue(h)}
              disabled={inPast(h) || (isDay && h + MIN_DAY_HOURS > 20)}
              onClick={() => pickIn(h)}
            >
              {hourLabel(h)}
            </button>
          ))}
        </div>

        <h3 className="sp-h">Check-out</h3>
        <div className="sp-times" role="group" aria-label="Check-out time">
          {CHOICE_HOURS.map((h) => (
            <button
              key={h}
              type="button"
              className={`sp-time${outTime === timeValue(h) ? ' is-on' : ''}`}
              aria-pressed={outTime === timeValue(h)}
              disabled={!outOk(h)}
              onClick={() => pickOut(h)}
            >
              {hourLabel(h)}
            </button>
          ))}
        </div>

        <h3 className="sp-h">Select a slot</h3>
        <p className="sp-note">Refer to the legend for availability.</p>
        {error && <Alert type="error" showIcon title={error} className="bk-alert" />}

        {!ready ? (
          <p className="sp-hint">Choose your check-in and check-out time to see the open slots.</p>
        ) : loading || slots === null ? (
          <div className="sp-wait"><Spin /></div>
        ) : (
          <div className="sp-grid" role="group" aria-label="Slots">
            {slots.map((s) => {
              const on = slot === s.slot;
              return (
                <button
                  key={s.slot}
                  type="button"
                  className={`sp-slot${on ? ' is-on' : ''}${s.taken ? ' is-taken' : ''}`}
                  aria-pressed={on}
                  aria-label={`Slot ${s.slot}${s.taken ? ', taken' : ''}`}
                  disabled={s.taken}
                  onClick={() => setSlot(on ? null : s.slot)}
                >
                  {s.slot}
                </button>
              );
            })}
          </div>
        )}

        <p className="sp-legend">
          <b>Legend:</b> Light cyan - <span className="sp-l-open">Available</span> Dark Cyan -{' '}
          <span className="sp-l-taken">Taken</span> Pink Outline - <span className="sp-l-sel">Selected</span>
        </p>
        {ready && slots && slots.every((s) => s.taken) && (
          <p className="sp-warn">This room is fully booked for that time. Please choose another time or room.</p>
        )}

        <h3 className="sp-confirm-title">Confirmation:</h3>
        <div className="sp-confirm" aria-live="polite">
          {slot && time && outTime ? (
            <p>
              <b className="sp-pink">Slot {slot}:</b> {fmt(dates.start, inHour)} - {fmt(dates.end, outHour)}
            </p>
          ) : (
            <p className="sp-hint">Pick your times and a slot.</p>
          )}
        </div>
      </div>

      <div className="sp-actions">
        <button type="button" className="sp-btn sp-back" onClick={onBack}>
          <LeftOutlined /> Back
        </button>
        <button
          type="button"
          className="sp-btn sp-confirm-btn"
          disabled={!canConfirm}
          onClick={() => onConfirm({ time, outTime, hours, slot })}
        >
          Confirm
        </button>
      </div>
    </section>
  );
}

export default SlotPanel;