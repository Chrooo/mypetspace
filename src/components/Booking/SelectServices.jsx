import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { Alert, DatePicker, Select } from 'antd';
import { LeftOutlined, RightOutlined, SlidersOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import BookingStep from './BookingStep';
import SlotModal from './SlotModal';
import { API_URL } from '../../auth';
import { MIN_DAY_HOURS, ROOM_CATEGORIES, ROOM_OPTIONS, stayTotal } from '../../data/roomOptions';
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

/* ---------- Room Type (room booking, step 2) ---------- */
// What this step remembers for the next steps:
//   booking:room:room    -> the chosen room's id (see data/roomOptions.js)
//   booking:room:dates   -> JSON { start: "YYYY-MM-DD", end: "YYYY-MM-DD" }
//   booking:room:time    -> check-in time "10:00"   (saved when the Slots pop-up is confirmed)
//   booking:room:outTime -> check-out time "16:00"
//   booking:room:hours   -> Day Boarding only: hours of the stay
//   booking:room:slot    -> the chosen slot number
// Choosing different dates clears the room, times and slot.
const roomKey = (type) => `booking:${type}:room`;
const datesKey = (type) => `booking:${type}:dates`;
const slotKey = (type) => `booking:${type}:slot`;
const removeSaved = (key) => {
  try {
    sessionStorage.removeItem(key);
  } catch (err) {
    /* storage unavailable */
  }
};
const clearSlotChoice = (type) => ['slot', 'time', 'outTime', 'hours'].forEach((n) => removeSaved(`booking:${type}:${n}`));

const readDates = (type) => {
  try {
    const d = JSON.parse(readSaved(datesKey(type)));
    if (d && dayjs(d.start).isValid() && dayjs(d.end).isValid()) return d;
  } catch (err) {
    /* nothing saved yet */
  }
  return null;
};

const PRICE_SORTS = [
  { value: 'low', label: 'Low to High' },
  { value: 'high', label: 'High to Low' },
];

function RoomType({ type }) {
  const navigate = useNavigate();
  const [room, setRoom] = useState(() => {
    const id = readSaved(roomKey(type));
    return ROOM_OPTIONS.some((r) => r.id === id) ? id : null;
  });
  const [dates, setDates] = useState(() => readDates(type)); // { start, end } or null
  const [slot, setSlot] = useState(() => Number(readSaved(slotKey(type))) || null); // confirmed slot of `room`
  const [openId, setOpenId] = useState(null); // the room whose Slots pop-up is open
  const [notice, setNotice] = useState('');
  const [categories, setCategories] = useState([]); // empty = show every category
  const [sort, setSort] = useState(null); // 'low' | 'high' | null (original order)
  const [avail, setAvail] = useState(null); // { [roomId]: { free, maxPets, reason? } } for the chosen dates
  const [availError, setAvailError] = useState('');

  const trackRef = useRef(null);
  const [edge, setEdge] = useState({ start: true, end: false });

  // ask the server how many slots each room type still has on the chosen dates
  const start = dates ? dates.start : null;
  const end = dates ? dates.end : null;
  useEffect(() => {
    setAvail(null);
    setAvailError('');
    if (!start || !end) return undefined;
    let active = true;
    axios
      .get(`${API_URL}/rooms/availability`, { params: { start, end } })
      .then(({ data }) => {
        if (!active) return;
        setAvail(Object.fromEntries(data.rooms.map((r) => [r.id, r])));
      })
      .catch((err) => {
        if (active) setAvailError(err.response?.data?.message || 'Could not check the available rooms. Please try again.');
      });
    return () => {
      active = false;
    };
  }, [start, end]);

  // a room that is full (or not possible for these dates) can't be chosen
  const stateOf = (r) => {
    const info = avail ? avail[r.id] : null;
    if (!info) return { free: null, blocked: false, reason: '' };
    return { free: info.free, blocked: info.free <= 0, reason: info.reason || '' };
  };

  // if the chosen room turns out to be full for the new dates, un-select it
  useEffect(() => {
    if (!room || !avail || !avail[room]) return;
    if (avail[room].free <= 0) {
      setRoom(null);
      setSlot(null);
      removeSaved(roomKey(type));
      clearSlotChoice(type);
    }
  }, [avail, room, type]);

  // the rooms that match the Filter, ordered by the Price dropdown
  let rooms = categories.length ? ROOM_OPTIONS.filter((r) => categories.includes(r.category)) : [...ROOM_OPTIONS];
  if (sort) {
    const dir = sort === 'low' ? 1 : -1;
    rooms.sort((a, b) => {
      if (a.price === null) return 1; // rooms without a fixed price always go last
      if (b.price === null) return -1;
      return (a.price - b.price) * dir;
    });
  }

  // grey out the arrows when the row can't move any further
  const updateEdge = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setEdge({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  }, []);
  useEffect(() => {
    updateEdge();
    window.addEventListener('resize', updateEdge);
    return () => window.removeEventListener('resize', updateEdge);
  }, [updateEdge, categories, sort]);

  // a pet must be chosen in step 1 first
  if (!readSaved(petKey(type))) return <Navigate to={`/book/${type}/pet-details`} replace />;

  const slide = (dir) => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector('.rt-card');
    const step = card ? card.offsetWidth + 14 : el.clientWidth / 2;
    el.scrollBy({ left: dir * step, behavior: 'smooth' });
  };

  // clicking a room opens the Slots pop-up (it needs the dates first)
  const onPick = (id) => {
    if (!dates) {
      setNotice('Please choose your check-in and check-out dates first.');
      return;
    }
    if (!avail) {
      setNotice('Still checking the available rooms. Please try again in a moment.');
      return;
    }
    setNotice('');
    setOpenId(id);
  };

  // Confirm in the pop-up: remember the choices and go to the Confirmation step
  const onSlotConfirm = (sel) => {
    writeSaved(roomKey(type), openId);
    writeSaved(`booking:${type}:time`, sel.time);
    writeSaved(`booking:${type}:outTime`, sel.outTime);
    if (sel.hours) writeSaved(`booking:${type}:hours`, String(sel.hours));
    else removeSaved(`booking:${type}:hours`);
    writeSaved(slotKey(type), String(sel.slot));
    setRoom(openId);
    setSlot(sel.slot);
    setOpenId(null);
    navigate(`/book/${type}/confirmation`);
  };

  const onDates = (range) => {
    clearSlotChoice(type); // new dates mean the room and slot must be picked again
    setRoom(null);
    setSlot(null);
    removeSaved(roomKey(type));
    setNotice('');
    if (range && range[0] && range[1]) {
      const next = { start: range[0].format('YYYY-MM-DD'), end: range[1].format('YYYY-MM-DD') };
      setDates(next);
      writeSaved(datesKey(type), JSON.stringify(next));
    } else {
      setDates(null);
      removeSaved(datesKey(type));
    }
  };

  const chosen = ROOM_OPTIONS.find((r) => r.id === room) || null;
  const chosenState = chosen ? stateOf(chosen) : null;
  const nights = dates ? dayjs(dates.end).diff(dayjs(dates.start), 'day') : 0;
  const stayText = dates
    ? dates.start === dates.end
      ? dayjs(dates.start).format('MMM D, YYYY')
      : `${dayjs(dates.start).format('MMM D')} - ${dayjs(dates.end).format('MMM D, YYYY')}`
    : '';
  const checked = !!avail; // availability for the chosen dates is known
  const canNext = !!chosen && !!slot && !!dates && checked && !chosenState.blocked;
  const total = chosen && dates ? stayTotal(chosen, nights, MIN_DAY_HOURS) : null;

  return (
    <BookingStep
      step="services"
      title="Book a Room"
      subtitle="Choose the perfect room for your fur babies."
      canNext={canNext}
    >
      {availError && <Alert type="error" showIcon title={availError} className="bk-alert" />}
      {notice && <Alert type="warning" showIcon title={notice} className="bk-alert" closable onClose={() => setNotice('')} />}

      <section className="rt-panel">
        <div className="rt-tools">
          <Select
            mode="multiple"
            allowClear
            maxTagCount="responsive"
            className="rt-pill rt-filter"
            placeholder="Filter"
            value={categories}
            onChange={setCategories}
            suffixIcon={<SlidersOutlined />}
            options={ROOM_CATEGORIES.map((c) => ({ value: c, label: c }))}
            aria-label="Filter rooms by category"
          />
          <Select
            allowClear
            className="rt-pill"
            placeholder="Price"
            value={sort}
            onChange={(v) => setSort(v ?? null)}
            options={PRICE_SORTS}
            aria-label="Sort rooms by price"
          />
          <DatePicker.RangePicker
            className="rt-pill rt-dates"
            placeholder={['Check-in', 'Check-out']}
            value={dates ? [dayjs(dates.start), dayjs(dates.end)] : null}
            onChange={onDates}
            disabledDate={(d) => d.isBefore(dayjs().startOf('day'))}
            format="MMM D, YYYY"
            separator="-"
            allowSameDay
          />
        </div>

        <div className="rt-carousel">
          <button
            type="button"
            className="rt-arrow"
            onClick={() => slide(-1)}
            disabled={edge.start}
            aria-label="Previous rooms"
          >
            <LeftOutlined />
          </button>

          <div className="rt-track" ref={trackRef} onScroll={updateEdge} role="listbox" aria-label="Room types">
            {rooms.length === 0 && <p className="rt-empty">No rooms match this filter.</p>}
            {rooms.map((r) => {
              const on = r.id === room && !!slot;
              const st = stateOf(r);
              return (
                <button
                  key={r.id}
                  type="button"
                  role="option"
                  aria-selected={on}
                  aria-disabled={st.blocked}
                  disabled={st.blocked}
                  className={`rt-card${on ? ' is-on' : ''}${st.blocked ? ' is-full' : ''}`}
                  onClick={() => onPick(r.id)}
                >
                  <span className="rt-top">
                    <img src={r.img} alt="" />
                    <span className="rt-name">
                      {r.name}
                      {r.sub && <small>{r.sub}</small>}
                    </span>
                  </span>
                  <span className="rt-price">{r.priceText}</span>
                  <span className="rt-max">{r.maxPets} pets max</span>
                  {st.blocked && (
                    <span className="rt-badge">{st.reason ? 'Not available for these dates' : 'Fully booked'}</span>
                  )}
                  {!st.blocked && st.free !== null && (
                    <span className="rt-left">{st.free} of {r.maxPets} slots left</span>
                  )}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            className="rt-arrow"
            onClick={() => slide(1)}
            disabled={edge.end}
            aria-label="More rooms"
          >
            <RightOutlined />
          </button>
        </div>

        <p className="rt-foot" aria-live="polite">
          {!dates && 'Choose your check-in and check-out dates, then click a room to pick your times and slot.'}
          {dates && !checked && !availError && 'Checking available rooms...'}
          {dates && checked && !(chosen && slot) && 'Click a room to choose your times and slot.'}
          {dates && checked && chosen && slot && !chosenState.blocked && (
            <>
              <b>{chosen.name}</b>, slot <b>{slot}</b>, {stayText}
              {chosen.kind === 'night' && <> ({nights} {nights === 1 ? 'night' : 'nights'})</>}
              {total !== null && <> - {chosen.kind === 'day' ? 'from ' : ''}<b>₱{total.toLocaleString()}</b></>}
            </>
          )}
        </p>
      </section>

      {openId && dates && (
        <SlotModal
          room={ROOM_OPTIONS.find((r) => r.id === openId)}
          dates={dates}
          initial={openId === room ? { time: readSaved(`booking:${type}:time`), outTime: readSaved(`booking:${type}:outTime`), slot } : null}
          onClose={() => setOpenId(null)}
          onConfirm={onSlotConfirm}
        />
      )}
    </BookingStep>
  );
}

function SelectServices() {
  const { type } = useParams();

  // grooming picks services; a room booking picks the room type and dates
  if (type === 'room') return <RoomType type={type} />;
  return <GroomingServices type={type} />;
}

export default SelectServices;