import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Alert, Modal, Spin } from 'antd';
import { ArrowLeftOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';
import { API_URL, getUser } from '../../auth';
import logo from '../../assets/logo.png';
import './CustomerDashboard.css'; // top bar styles are shared with the dashboard
import './MyBookings.css';

const PAGE_SIZE = 5; // rows per page
const POLL_MS = 10000; // the list is refreshed from the server every 10 seconds

/* ---------- date and money helpers (all shown in Philippine time) ---------- */
const TZ = 'Asia/Manila';
const DATE = { month: 'short', day: '2-digit', year: 'numeric' };
const TIME = { hour: 'numeric', minute: '2-digit', hour12: true };

const inManila = (value, options) => new Intl.DateTimeFormat('en-US', { timeZone: TZ, ...options }).format(new Date(value));
const stamp = (value) => `${inManila(value, DATE)} - ${inManila(value, TIME)}`; // Mar 01, 2026 - 10:00 AM

// "2026-03-05" (a plain calendar day) -> "Mar 05" or "Mar 05, 2026"
const dayText = (day, withYear) =>
  new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'short', day: '2-digit', ...(withYear ? { year: 'numeric' } : {}) }).format(
    new Date(`${day}T00:00:00Z`)
  );

const peso = (n) => `₱${Number(n).toLocaleString('en-PH', { maximumFractionDigits: 2 })}`;
const amountText = (b) => (b.total > 0 ? peso(b.total) : 'TBC'); // TBC = the shop has not set the price yet

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

const STATUS = {
  pending: { label: 'Pending', cls: 'is-pending' },
  confirmed: { label: 'Confirmed', cls: 'is-confirmed' },
  paid: { label: 'Paid', cls: 'is-paid' },
  in_progress: { label: 'In Progress', cls: 'is-progress' },
  checked_in: { label: 'Checked In', cls: 'is-progress' },
  completed: { label: 'Completed', cls: 'is-completed' },
  cancelled: { label: 'Cancelled', cls: 'is-cancelled' },
};
const statusOf = (b) => STATUS[b.displayStatus] || { label: b.displayStatus, cls: '' };

const METHODS = { GCASH: 'GCash', MAYA: 'Maya', BANK: 'Bank transfer', CASH: 'Cash' };

/* ---------- what each row says ---------- */
const titleOf = (b) => (b.kind === 'room' ? `Hotel Reservation (${b.roomName})` : `Grooming Service (${b.services.join(', ')})`);

const durationOf = (b) => (b.nights > 0 ? plural(b.nights, 'night', 'nights') : b.hours > 0 ? plural(b.hours, 'hr', 'hrs') : '');

const whenOf = (b) => {
  if (b.kind === 'grooming') return stamp(b.scheduledAt);
  if (b.nights > 0) {
    const sameYear = b.startDate.slice(0, 4) === b.endDate.slice(0, 4);
    return `${dayText(b.startDate, !sameYear)} - ${dayText(b.endDate, true)} (${durationOf(b)})`;
  }
  // Day Boarding: one day, from a time to a time
  const end = b.checkOutAt ? ` to ${inManila(b.checkOutAt, TIME)}` : '';
  const hrs = durationOf(b) ? ` (${durationOf(b)})` : '';
  return `${dayText(b.startDate, true)} - ${inManila(b.checkInAt, TIME)}${end}${hrs}`;
};

const detailRows = (b) => {
  const rows = [
    ['Booking No.', b.ref],
    ['Type', b.kind === 'room' ? 'Hotel Reservation' : 'Grooming Appointment'],
    ['Status', statusOf(b).label],
    ['Pet', [b.petName, b.petType, b.petBreed].filter(Boolean).join(' · ')],
  ];
  if (b.kind === 'room') {
    rows.push(
      ['Room', b.roomName],
      ['Slot', `Slot ${b.slot}`],
      ['Check-in', stamp(b.checkInAt)],
      ['Check-out', b.checkOutAt ? stamp(b.checkOutAt) : '-'],
      ['Duration', durationOf(b) || '-']
    );
  } else {
    const paid = b.paymentStatus === 'paid';
    const how = [METHODS[b.paymentMethod] && `via ${METHODS[b.paymentMethod]}`, b.paidAt && `on ${inManila(b.paidAt, DATE)}`].filter(Boolean).join(' ');
    rows.push(
      ['Services', b.services.join(', ')],
      ['Appointment', stamp(b.scheduledAt)],
      ['Groomer', b.groomerName || 'To be assigned'],
      ['Payment', paid ? `Paid ${how}`.trim() : 'Unpaid']
    );
  }
  rows.push(['Amount', amountText(b)], ['Booked on', stamp(b.createdAt)]);
  return rows;
};

// 1 ... 4 5 6 ... 20  (every page number when there are only a few pages)
const pageItems = (current, total) => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const items = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) items.push('gap-left');
  for (let p = start; p <= end; p += 1) items.push(p);
  if (end < total - 1) items.push('gap-right');
  items.push(total);
  return items;
};

function MyBookings() {
  const user = getUser();
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null); // null = still loading
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState(null);
  const [selected, setSelected] = useState(null); // the booking shown in the Details window
  const lastRequest = useRef(0);

  // asks the server for the current page. Safe to call as often as we like.
  const load = useCallback(async () => {
    const id = (lastRequest.current += 1);
    try {
      const { data: result } = await axios.get(`${API_URL}/my/bookings`, { params: { page, pageSize: PAGE_SIZE } });
      if (id !== lastRequest.current) return; // an older answer arrived after a newer one: ignore it
      setData(result);
      setError('');
      setUpdatedAt(new Date());
      if (result.page !== page) setPage(result.page); // that page no longer exists (it was the last one)
    } catch (err) {
      if (id !== lastRequest.current) return;
      setError(err.response?.data?.message || 'Could not reach the server.');
    }
  }, [page]);

  // real-time: load now, then every POLL_MS, and again whenever the customer comes back to this tab
  useEffect(() => {
    load();
    const refresh = () => {
      if (!document.hidden) load();
    };
    const timer = setInterval(refresh, POLL_MS);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [load]);

  const bookings = data?.bookings || [];
  const totalPages = data?.totalPages || 1;
  const current = data?.page || page;
  const shown = bookings.find((b) => b._id === selected?._id) || selected; // keeps the open window up to date too

  return (
    <div className="cd">
      <header className="cd-top">
        <Link to="/" aria-label="My Pet Space home">
          <img src={logo} alt="My Pet Space" className="cd-logo" />
        </Link>
        <span className="cd-top-title">User Dashboard</span>
        <Link to="/account" className="mb-back" aria-label="Back to dashboard">
          <ArrowLeftOutlined />
        </Link>
        <Link to="/account/profile" className="cd-avatar" aria-label="My profile">
          {user?.avatar ? (
            <img src={user.avatar} alt="" className="cd-avatar-img" />
          ) : (
            <>
              <span className="cd-avatar-sky" />
              <span className="cd-avatar-hill" />
            </>
          )}
        </Link>
      </header>

      <main className="mb-main">
        <div className="mb-head">
          <div>
            <h1 className="mb-title">MY BOOKINGS</h1>
            <p className="mb-sub">Track your booking history here.</p>
          </div>
          {updatedAt && (
            <span className={`mb-live${error ? ' is-off' : ''}`} role="status">
              <i /> {error ? 'Connection lost, retrying...' : `Live - updated ${inManila(updatedAt, { ...TIME, second: '2-digit' })}`}
            </span>
          )}
        </div>

        {error && !data && <Alert type="error" showIcon title={error} className="mb-alert" />}

        {!data && !error ? (
          <div className="mb-loading"><Spin size="large" /></div>
        ) : data && data.total === 0 ? (
          <div className="mb-empty">
            <p>You have no bookings yet.</p>
            <div className="mb-empty-actions">
              <Link to="/book/room" className="mb-btn">Book a Room</Link>
              <Link to="/book/grooming" className="mb-btn">Book Grooming</Link>
            </div>
          </div>
        ) : (
          data && (
            <>
              <div className="mb-scroll">
                <table className="mb-table">
                  <thead>
                    <tr>
                      <th>No.</th>
                      <th>Date &amp; Time</th>
                      <th>Service/Room</th>
                      <th>Amount</th>
                      <th>Receipt</th>
                      <th>Status</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((b, i) => {
                      const status = statusOf(b);
                      return (
                        <tr key={`${b.kind}-${b._id}`}>
                          <td>{(current - 1) * data.pageSize + i + 1}</td>
                          <td>{stamp(b.createdAt)}</td>
                          <td className="mb-service">
                            <b>{titleOf(b)}</b>
                            <small>{whenOf(b)}</small>
                          </td>
                          <td>{amountText(b)}</td>
                          <td><Link to={`/receipts/${b.ref}`} className="mb-view">View</Link></td>
                          <td><span className={`mb-status ${status.cls}`}>{status.label}</span></td>
                          <td>
                            <button type="button" className="mb-view" onClick={() => setSelected(b)}>View</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <nav className="mb-pager" aria-label="Bookings pages">
                <button type="button" className="mb-arrow" disabled={current <= 1} onClick={() => setPage(current - 1)} aria-label="Previous page">
                  <LeftOutlined />
                </button>
                {pageItems(current, totalPages).map((item) =>
                  typeof item === 'number' ? (
                    <button
                      key={item}
                      type="button"
                      className={`mb-page${item === current ? ' is-on' : ''}`}
                      aria-current={item === current ? 'page' : undefined}
                      onClick={() => setPage(item)}
                    >
                      {item}
                    </button>
                  ) : (
                    <span key={item} className="mb-gap">...</span>
                  )
                )}
                <button type="button" className="mb-arrow" disabled={current >= totalPages} onClick={() => setPage(current + 1)} aria-label="Next page">
                  <RightOutlined />
                </button>
              </nav>
            </>
          )
        )}
      </main>

      <Modal open={!!shown} title="Booking Details" footer={null} centered onCancel={() => setSelected(null)}>
        {shown && (
          <dl className="mb-details">
            {detailRows(shown).map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </Modal>
    </div>
  );
}

export default MyBookings;