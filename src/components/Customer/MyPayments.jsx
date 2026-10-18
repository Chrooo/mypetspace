import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Alert, Spin } from 'antd';
import { ArrowLeftOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';
import { API_URL, useUser } from '../../auth';
import logo from '../../assets/logo.png';
import { HeaderAvatar } from './Avatar';
import './CustomerDashboard.css'; // top bar styles are shared with the dashboard
import './MyBookings.css'; // the table and pagination look the same as My Bookings
import './MyPayments.css';

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
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

const METHODS = { CARD: 'Card', GCASH: 'GCash', MAYA: 'Maya', BANK: 'Bank transfer', CASH: 'Cash' };

const STATUS = {
  paid: { label: 'Paid', cls: 'is-paid' },
  partial: { label: 'Partially Paid', cls: 'is-partial' },
  pending: { label: 'Pending', cls: 'is-pending' },
};

/* ---------- what each row says ---------- */
const titleOf = (p) => (p.kind === 'room' ? `Hotel Reservation (${p.roomName})` : `Grooming Service (${p.services.join(', ')})`);

const durationOf = (p) => (p.nights > 0 ? plural(p.nights, 'night', 'nights') : p.hours > 0 ? plural(p.hours, 'hr', 'hrs') : '');

const whenOf = (p) => {
  if (p.kind === 'grooming') return stamp(p.scheduledAt);
  if (!p.startDate || !p.endDate) return p.datesText;
  if (p.nights > 0) {
    const sameYear = p.startDate.slice(0, 4) === p.endDate.slice(0, 4);
    return `${dayText(p.startDate, !sameYear)} - ${dayText(p.endDate, true)} (${durationOf(p)})`;
  }
  // Day Boarding: one day, from a time to a time
  const end = p.checkOutAt ? ` to ${inManila(p.checkOutAt, TIME)}` : '';
  const hrs = durationOf(p) ? ` (${durationOf(p)})` : '';
  return `${dayText(p.startDate, true)}${p.checkInAt ? ` - ${inManila(p.checkInAt, TIME)}` : ''}${end}${hrs}`;
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

function MyPayments() {
  const user = useUser();
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null); // null = still loading
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState(null);
  const lastRequest = useRef(0);

  // asks the server for the current page. Safe to call as often as we like.
  const load = useCallback(async () => {
    const id = (lastRequest.current += 1);
    try {
      const { data: result } = await axios.get(`${API_URL}/my/payments`, { params: { page, pageSize: PAGE_SIZE } });
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

  const payments = data?.payments || [];
  const totalPages = data?.totalPages || 1;
  const current = data?.page || page;

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
        <HeaderAvatar user={user} />
      </header>

      <main className="mb-main">
        <div className="mb-head">
          <div>
            <h1 className="mb-title">MY PAYMENTS</h1>
            <p className="mb-sub">Track your payment history here.</p>
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
            <p>You have no payments yet.</p>
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
                      <th>Mode of Payment</th>
                      <th>Status</th>
                      <th>Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p, i) => {
                      const status = STATUS[p.status] || { label: p.status, cls: '' };
                      return (
                        <tr key={`${p.kind}-${p._id}`}>
                          <td>{(current - 1) * data.pageSize + i + 1}</td>
                          <td>{stamp(p.paidAt)}</td>
                          <td className="mb-service">
                            <b>{titleOf(p)}</b>
                            <small>{whenOf(p)}</small>
                          </td>
                          <td>
                            {p.status === 'pending' ? 'TBC' : peso(p.amount)}
                            {p.status === 'partial' && <small className="mb-amount-sub">of {peso(p.total)}</small>}
                          </td>
                          <td>{METHODS[p.method] || p.method}</td>
                          <td><span className={`mb-status ${status.cls}`}>{status.label}</span></td>
                          <td><Link to={`/receipts/${p.receiptId}`} className="mb-view">View</Link></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <nav className="mb-pager" aria-label="Payments pages">
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
    </div>
  );
}

export default MyPayments;