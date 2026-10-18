import { useEffect, useState } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Alert } from 'antd';
import { CreditCardOutlined } from '@ant-design/icons';
import { API_URL, getUser } from '../../auth';
import { saveReceipt } from '../Receipt/receiptData';
import BookingStep from './BookingStep';
import { findRoom, hourLabel, stayTotal } from '../../data/roomOptions';
import './Booking.css';

// Payment (room booking, step 4). What the earlier steps remembered:
//   pet, room, dates, time, outTime, hours (Day Boarding), slot   (booking:room:<name>)
// The booking is saved when Pay Now is pressed (that is when the slot is really taken), and then the
// Receipt page opens. The "book another?" pop-up appears there, after the receipt is saved or printed.
// NOTE: there is no payment gateway yet. The card details are only checked here, they are never
// stored or sent anywhere. Recording the payment is still to be built (see server/models/Payment.js).
const key = (type, name) => `booking:${type}:${name}`;
const ROOM_NAMES = ['pet', 'room', 'dates', 'time', 'outTime', 'hours', 'slot'];

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
const clearRoomBooking = (type) => {
  try {
    ROOM_NAMES.forEach((n) => sessionStorage.removeItem(key(type, n)));
  } catch (err) {
    /* ignore */
  }
};

const peso = (n) => `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const COUNTRIES = ['Philippines', 'United States', 'Canada', 'United Kingdom', 'Australia', 'Singapore', 'Japan', 'Other'];

// ----- small input helpers -----
const digits = (v) => v.replace(/\D/g, '');
const fmtCard = (v) => digits(v).slice(0, 19).replace(/(.{4})/g, '$1 ').trim();
const fmtExpiry = (v) => {
  const d = digits(v).slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
};
const expiryOk = (v) => {
  const m = /^(\d{2})\/(\d{2})$/.exec(v);
  if (!m) return false;
  const month = Number(m[1]);
  if (month < 1 || month > 12) return false;
  return !dayjs(`20${m[2]}-${m[1]}-01`).endOf('month').isBefore(dayjs());
};

function RoomPayment({ type }) {
  const navigate = useNavigate();

  // read once, so clearing the saved choices after booking doesn't redirect this page
  const [draft] = useState(() => {
    const dates = readJson(key(type, 'dates'));
    return {
      petId: readSaved(key(type, 'pet')),
      room: findRoom(readSaved(key(type, 'room'))),
      dates: dates && dates.start && dates.end ? dates : null,
      time: readSaved(key(type, 'time')),
      outTime: readSaved(key(type, 'outTime')),
      slot: Number(readSaved(key(type, 'slot'))) || null,
    };
  });

  const [pet, setPet] = useState(null);
  const [petError, setPetError] = useState('');
  const [amountChoice, setAmountChoice] = useState('half'); // 'full' | 'half'
  const [method, setMethod] = useState('card'); // 'card' | 'gcash'
  const [card, setCard] = useState({ number: '', expiry: '', cvv: '', zip: '', country: 'Philippines' });
  const [tried, setTried] = useState(false); // Pay Now was pressed: show what is missing
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [slotError, setSlotError] = useState(''); // the slot was taken while the customer was paying

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
  const hours = endHour - startHour;
  const total = stayTotal(room, nights, hours); // null = Peak/Holiday: the shop confirms the price
  const half = total === null ? null : Math.round(total / 2);
  const payNow = total === null ? null : amountChoice === 'full' ? total : half;
  const today = dayjs().format('MMM D, YYYY');

  const dateText = isDay
    ? `${dayjs(dates.start).format('MMM DD, YYYY')} (${hourLabel(startHour)} - ${hourLabel(endHour)})`
    : `${dayjs(dates.start).format('MMM DD')} - ${dayjs(dates.end).format('MMM DD, YYYY')}`;
  const roomTitle = room.sub ? `${room.name} (${room.sub})` : room.name;
  const priceLine = isDay
    ? `${hours} ${hours === 1 ? 'hour' : 'hours'} (first 3 hours ₱${room.price}, then ₱${room.extraHour}/hour)`
    : `${nights} ${nights === 1 ? 'night' : 'nights'} x ₱${room.price}`;

  // ----- card checks (only used when paying by card) -----
  const errors = {};
  if (method === 'card') {
    const n = digits(card.number);
    if (n.length < 13 || n.length > 19) errors.number = 'Enter a valid card number.';
    if (!expiryOk(card.expiry)) errors.expiry = 'Use MM/YY (a date that has not passed).';
    if (!/^\d{3,4}$/.test(card.cvv)) errors.cvv = 'Enter the 3 or 4 digit code.';
    if (!card.zip.trim()) errors.zip = 'Enter your ZIP code.';
  }
  const setField = (name) => (e) => {
    let v = e.target.value;
    if (name === 'number') v = fmtCard(v);
    if (name === 'expiry') v = fmtExpiry(v);
    if (name === 'cvv') v = digits(v).slice(0, 4);
    setCard((c) => ({ ...c, [name]: v }));
  };

  const onPay = async () => {
    setTried(true);
    setSubmitError('');
    if (Object.keys(errors).length > 0) return;
    setSubmitting(true);
    try {
      const { data } = await axios.post(`${API_URL}/rooms/reservations`, {
        petId: draft.petId,
        roomId: room.id,
        slot: draft.slot,
        start: dates.start,
        end: dates.end,
        time: draft.time,
        outTime: draft.outTime,
      });
      // keep what the receipt needs (the booking choices are cleared below)
      const user = getUser() || {};
      const receiptId = saveReceipt(data.reservation?._id, {
        customerName: user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Customer',
        contact: user.identifier || '',
        roomName: roomTitle,
        datesText: isDay
          ? dayjs(dates.start).format('MMM DD, YYYY')
          : `${dayjs(dates.start).format('MMM DD')} - ${dayjs(dates.end).format('MMM DD, YYYY')}`,
        petText: pet ? `${pet.name} (${pet.breed})` : '',
        slot: draft.slot,
        checkIn: `${dayjs(dates.start).format('MMMM D, YYYY')} ${hourLabel(startHour)}`,
        checkOut: `${dayjs(dates.end).format('MMMM D, YYYY')} ${hourLabel(endHour)}`,
        priceText: priceLine,
        total,
        paid: payNow,
        downpayment: total !== null && amountChoice === 'half' ? half : null,
        method: method === 'card' ? 'Card' : 'GCash',
      });
      clearRoomBooking(type);
      navigate(`/receipts/${receiptId}`, { replace: true });
    } catch (err) {
      const message = err.response?.data?.message || 'Could not reach the server. Please try again.';
      if (err.response?.status === 409) setSlotError(message);
      else setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const showErr = (name) => tried && errors[name];

  return (
    <BookingStep
      step="payment"
      title="Book a Room"
      subtitle="Choose the perfect room for your fur babies."
      hideActions
    >
      {petError && <Alert type="error" showIcon title={petError} className="py-alert" action={<Link to={`/book/${type}/pet-details`}>Choose a pet</Link>} />}
      {slotError && <Alert type="error" showIcon title={slotError} className="py-alert" action={<Link to={`/book/${type}/services`}>Choose another slot</Link>} />}
      {submitError && <Alert type="error" showIcon title={submitError} className="py-alert" />}

      <div className="py-wrap">
        <h2 className="py-main-title">Confirm and Pay</h2>

        {/* 1. how much to pay now */}
        <section className="py-card" aria-labelledby="py-h1">
          <h3 className="py-title" id="py-h1"><span>1.</span> Choose how much to Pay</h3>
          {total === null ? (
            <p className="py-note">The price of a Peak/Holiday stay includes a surcharge. The shop will confirm the amount with you.</p>
          ) : (
            <div role="radiogroup" aria-label="Amount to pay now">
              <label className="py-option">
                <span>
                  <b>Pay {peso(total)} now</b>
                  <small>The full amount will be charged on {today}.</small>
                </span>
                <input type="radio" name="amount" checked={amountChoice === 'full'} onChange={() => setAmountChoice('full')} />
              </label>
              <label className="py-option">
                <span>
                  <b>Pay {peso(half)} now</b>
                  <small>{peso(half)} will be charged on {today}, as a reservation fee.</small>
                </span>
                <input type="radio" name="amount" checked={amountChoice === 'half'} onChange={() => setAmountChoice('half')} />
              </label>
            </div>
          )}
        </section>

        {/* 2. payment method */}
        <section className="py-card" aria-labelledby="py-h2">
          <h3 className="py-title" id="py-h2"><span>2.</span> Add Payment Method</h3>

          <div role="radiogroup" aria-label="Payment method">
            <label className="py-method">
              <span className="py-method-name"><CreditCardOutlined /> Credit or Debit Card</span>
              <input type="radio" name="method" checked={method === 'card'} onChange={() => setMethod('card')} />
            </label>

            {method === 'card' && (
              <div className="py-card-form">
                <div className="py-box">
                  <label className="py-field">
                    <span>Card Number</span>
                    <input
                      value={card.number}
                      onChange={setField('number')}
                      inputMode="numeric"
                      autoComplete="cc-number"
                      placeholder="1234 5678 9012 3456"
                      aria-invalid={!!showErr('number')}
                    />
                  </label>
                  {showErr('number') && <p className="py-err">{errors.number}</p>}
                  <div className="py-split">
                    <label className="py-field">
                      <span>Expiration</span>
                      <input
                        value={card.expiry}
                        onChange={setField('expiry')}
                        inputMode="numeric"
                        autoComplete="cc-exp"
                        placeholder="MM/YY"
                        aria-invalid={!!showErr('expiry')}
                      />
                    </label>
                    <label className="py-field">
                      <span>CVV</span>
                      <input
                        value={card.cvv}
                        onChange={setField('cvv')}
                        inputMode="numeric"
                        autoComplete="cc-csc"
                        placeholder="123"
                        aria-invalid={!!showErr('cvv')}
                      />
                    </label>
                  </div>
                  {(showErr('expiry') || showErr('cvv')) && <p className="py-err">{errors.expiry || errors.cvv}</p>}
                </div>

                <label className="py-box py-field">
                  <span>ZIP code</span>
                  <input value={card.zip} onChange={setField('zip')} autoComplete="postal-code" aria-invalid={!!showErr('zip')} />
                </label>
                {showErr('zip') && <p className="py-err">{errors.zip}</p>}

                <label className="py-box py-field">
                  <span>Country/region</span>
                  <select value={card.country} onChange={setField('country')} autoComplete="country-name">
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </label>
              </div>
            )}
          </div>

          <hr className="py-rule" />

          <h4 className="py-sub">E-wallets</h4>
          <label className="py-method">
            <span className="py-method-name">
              <span className="py-gcash" aria-hidden="true">G<small>GCash</small></span>
              GCash
            </span>
            <input type="radio" name="method" checked={method === 'gcash'} onChange={() => setMethod('gcash')} />
          </label>
        </section>

        {/* 3. review */}
        <section className="py-card" aria-labelledby="py-h3">
          <h3 className="py-title" id="py-h3"><span>3.</span> Review your Reservation</h3>

          <div className="py-review">
            <img className="py-img" src={room.img} alt={room.name} />

            <div className="py-info">
              <h4 className="py-room">{roomTitle}</h4>

              <div className="py-line">
                <div>
                  <b>Dates</b>
                  <p>{dateText}</p>
                </div>
                <Link to={`/book/${type}/services`} className="py-change">Change</Link>
              </div>

              <div className="py-line">
                <div>
                  <b>Pets</b>
                  <p>{pet ? `${pet.name} (${pet.breed})` : '...'} - Slot {draft.slot}</p>
                </div>
                <Link to={`/book/${type}/pet-details`} className="py-change">Change</Link>
              </div>

              <div className="py-line py-price">
                <div>
                  <b>Price Details</b>
                  <p>{priceLine}</p>
                </div>
                <span>{total === null ? 'TBC' : peso(total)}</span>
              </div>

              <div className="py-sum">
                <p><b>Total PHP</b><span>{total === null ? 'Confirmed by the shop' : peso(total)}</span></p>
                <p><b>{amountChoice === 'full' && total !== null ? 'Amount due now' : 'Downpayment fee'}</b><span>{payNow === null ? '-' : peso(payNow)}</span></p>
              </div>

              <button type="button" className="py-pay" disabled={!pet || submitting || !!slotError} onClick={onPay}>
                {submitting ? 'Processing...' : 'Pay Now'}
              </button>
            </div>
          </div>
        </section>

        <div className="py-back">
          <Link to={`/book/${type}/confirmation`} className="btn btn-outline-teal">Back</Link>
        </div>
      </div>
    </BookingStep>
  );
}

function Payment() {
  const { type } = useParams();

  // only room bookings have a payment step (the grooming flow ends at Confirmation)
  if (type === 'room') return <RoomPayment type={type} />;

  return <BookingStep step="payment" title="Payment" />;
}

export default Payment;