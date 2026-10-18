import { useEffect, useState } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import { Alert, Modal, Spin } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import { API_URL } from '../../auth';
import { CHOICE_HOURS, MIN_DAY_HOURS, hourLabel, timeValue } from '../../data/roomOptions';
import './Booking.css';

// The "SLOTS" pop-up that opens when a room type is clicked.
//   room     -> the room type (from data/roomOptions.js)
//   dates    -> { start: "YYYY-MM-DD", end: "YYYY-MM-DD" } chosen on the page
//   initial  -> { time, outTime, slot } remembered from an earlier visit (or null)
//   onClose  -> called when the pop-up is closed without confirming
//   onConfirm({ time, outTime, hours, slot }) -> called with the choices
function SlotModal({ room, dates, initial, onClose, onConfirm }) {
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
    <Modal
      open
      centered
      width={560}
      footer={null}
      closable={false}
      onCancel={onClose}
      className="sm-modal"
      destroyOnHidden
    >
      <button type="button" className="sm-close" onClick={onClose} aria-label="Close">
        <CloseOutlined />
      </button>
      <h2 className="sm-title">SLOTS</h2>

      <div className="sm-top">
        <b>Room: {room.name}</b>
        <b>Date: {dateText}</b>
      </div>
      <p className="sm-note">Choose your preferred check-in and check-out time.</p>

      <h3 className="sm-h">Check-in</h3>
      <div className="sm-times" role="group" aria-label="Check-in time">
        {CHOICE_HOURS.map((h) => (
          <button
            key={h}
            type="button"
            className={`sm-time${time === timeValue(h) ? ' is-on' : ''}`}
            aria-pressed={time === timeValue(h)}
            disabled={inPast(h) || (isDay && h + MIN_DAY_HOURS > 20)}
            onClick={() => pickIn(h)}
          >
            {hourLabel(h)}
          </button>
        ))}
      </div>

      <h3 className="sm-h">Check-out</h3>
      <div className="sm-times" role="group" aria-label="Check-out time">
        {CHOICE_HOURS.map((h) => (
          <button
            key={h}
            type="button"
            className={`sm-time${outTime === timeValue(h) ? ' is-on' : ''}`}
            aria-pressed={outTime === timeValue(h)}
            disabled={!outOk(h)}
            onClick={() => pickOut(h)}
          >
            {hourLabel(h)}
          </button>
        ))}
      </div>

      <h3 className="sm-h">Select a slot</h3>
      <p className="sm-note">Refer to the legend for availability.</p>
      {error && <Alert type="error" showIcon title={error} className="bk-alert" />}

      {!ready ? (
        <p className="sm-hint">Choose your check-in and check-out time to see the open slots.</p>
      ) : loading || slots === null ? (
        <div className="sm-wait"><Spin /></div>
      ) : (
        <div className="sm-grid" role="group" aria-label="Slots">
          {slots.map((s) => {
            const on = slot === s.slot;
            return (
              <button
                key={s.slot}
                type="button"
                className={`sm-slot${on ? ' is-on' : ''}${s.taken ? ' is-taken' : ''}`}
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

      <p className="sm-legend">
        <b>Legend:</b> Light cyan - <span className="sm-l-open">Available</span> Dark Cyan -{' '}
        <span className="sm-l-taken">Taken</span> Pink Outline - <span className="sm-l-sel">Selected</span>
      </p>
      {ready && slots && slots.every((s) => s.taken) && (
        <p className="sm-warn">This room is fully booked for that time. Please choose another time or room.</p>
      )}

      <h3 className="sm-confirm-title">Confirmation:</h3>
      <div className="sm-confirm" aria-live="polite">
        {slot && time && outTime ? (
          <p>
            <b className="sm-pink">Slot {slot}:</b> {fmt(dates.start, inHour)} - {fmt(dates.end, outHour)}
          </p>
        ) : (
          <p className="sm-hint">Pick your times and a slot.</p>
        )}
        <button
          type="button"
          className="sm-btn"
          disabled={!canConfirm}
          onClick={() => onConfirm({ time, outTime, hours, slot })}
        >
          Confirm
        </button>
      </div>
    </Modal>
  );
}

export default SlotModal;