import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getUser } from '../../auth';
import { Modal, Spin } from 'antd';
import PageShell from '../Layout/PageShell';
import logo from '../../assets/logo.png';
import { API_URL } from '../../auth';
import { readReceipt, syncReceipt } from './receiptData';
import './Receipt.css';

const peso = (n) => `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const TBC = 'To be confirmed by the shop';

// The receipt of a booking.
//  - Right after "Pay Now" it is read from this browser tab (see Booking/Payment.jsx and receiptData.js) and
//    saved on the server. Print / Save as PDF opens the print window; when it closes, the "book another?"
//    pop-up appears.
//  - Opened later (from My Payments, or on another device) it is loaded from the server.
//  - An id the server does not know shows "We could not find that receipt".
function Receipt() {
  const { id } = useParams();
  const navigate = useNavigate();
  const role = getUser()?.role;
  // the back arrow: a customer goes to their payments, staff and admin back to the bookings list
  const backTo = role === 'customer' ? '/account/payments' : '/manage/reservations';
  const local = useMemo(() => readReceipt(id), [id]); // made in this tab, just now
  const [fetched, setFetched] = useState({ id: null, receipt: null }); // loaded from the server
  const [askAnother, setAskAnother] = useState(false);

  // not in this tab: ask the server for it
  useEffect(() => {
    if (local) return undefined;
    let active = true;
    axios
      .get(`${API_URL}/receipts/${encodeURIComponent(id)}`)
      .then(({ data }) => active && setFetched({ id, receipt: data.receipt }))
      .catch(() => active && setFetched({ id, receipt: null }));
    return () => {
      active = false;
    };
  }, [id, local]);

  // made in this tab: save the payment on the server (3 tries, in case the connection drops for a moment)
  useEffect(() => {
    if (!local || !local.reservationId) return undefined;
    let stopped = false;
    let timer;
    const attempt = (n) =>
      syncReceipt(local).catch(() => {
        if (!stopped && n < 3) timer = setTimeout(() => attempt(n + 1), 3000);
      });
    attempt(1);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [local]);

  // the print / save window was closed -> ask if the customer wants to book another room
  useEffect(() => {
    if (!local) return undefined;
    const onAfterPrint = () => setAskAnother(true);
    window.addEventListener('afterprint', onAfterPrint);
    return () => window.removeEventListener('afterprint', onAfterPrint);
  }, [local]);

  const receipt = local || (fetched.id === id ? fetched.receipt : null);
  const loading = !local && fetched.id !== id;

  if (loading) {
    return (
      <PageShell title="Receipt" subtitle="Loading your receipt..." account backTo={backTo}>
        <div style={{ padding: '40px 0', textAlign: 'center' }}><Spin size="large" /></div>
      </PageShell>
    );
  }

  if (!receipt) {
    return (
      <PageShell title="Receipt" subtitle="We could not find that receipt." account backTo={backTo}>
        <p style={{ maxWidth: 520 }}>
          The receipt <b>{id}</b> does not exist, or it belongs to another account. A grooming receipt is only made once the shop
          has recorded your payment.
        </p>
        <div className="page-actions" style={{ marginTop: 18 }}>
          <Link to={backTo} className="btn btn-outline-teal">{role === 'customer' ? 'Back to my payments' : 'Back to hotel stays'}</Link>
        </div>
      </PageShell>
    );
  }

  const r = receipt;
  const hasTotal = typeof r.total === 'number';
  const paid = typeof r.paid === 'number' ? r.paid : 0;
  const remaining = hasTotal ? Math.max(r.total - paid, 0) : null;

  const rows =
    r.kind === 'grooming'
      ? [
          ['Service:', r.serviceText],
          ['Pet/s:', r.petText],
          ['Appointment:', r.scheduleText],
          ['Groomer:', r.groomerName || 'To be assigned'],
          ['Booking No.:', r.bookingNo],
        ]
      : [
          ['Room:', r.roomName],
          ['Dates:', r.datesText],
          ['Pet/s:', r.petText],
          ['Check-In:', r.checkIn],
          ['Check-Out:', r.checkOut],
          ['Price:', r.priceText],
          ['Booking No.:', r.bookingNo],
        ];

  return (
    <PageShell title="Receipt" subtitle="This is your receipt." account backTo={backTo}>
      <article className="rc-card" aria-label="Booking receipt">
        <header className="rc-head">
          <img src={logo} alt="My Pet Space" className="rc-logo" />
          <h2>Booking Receipt</h2>
        </header>

        <div className="rc-meta">
          <p><b>Date &amp; Time:</b> {dayjs(r.issuedAt).format('MM-DD-YYYY HH:mm:ss')}</p>
          <p><b>Receipt No.:</b> {r.receiptNo}</p>
        </div>

        <h3 className="rc-section">Customer Details</h3>
        <dl className="rc-rows">
          <div><dt>Name:</dt><dd>{r.customerName}</dd></div>
          <div><dt>Contact:</dt><dd>{r.contact || '-'}</dd></div>
        </dl>

        <h3 className="rc-section">Booking Details</h3>
        <dl className="rc-rows">
          {rows.map(([label, value]) => (
            <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
          ))}
        </dl>

        <dl className="rc-rows rc-totals">
          <div className="rc-total"><dt>Total Amount:</dt><dd>{hasTotal ? peso(r.total) : TBC}</dd></div>
          {r.downpayment !== null && r.downpayment !== undefined && (
            <div><dt>Downpayment fee:</dt><dd>{peso(r.downpayment)}</dd></div>
          )}
          <div><dt>Amount Paid:</dt><dd>{peso(paid)}</dd></div>
          <div><dt>Remaining Amount:</dt><dd className="rc-strong">{remaining === null ? TBC : peso(remaining)}</dd></div>
          <div><dt>Payment Method:</dt><dd>{r.method}</dd></div>
        </dl>

        <footer className="rc-foot">
          <p className="rc-thanks">Thank you for booking with us!</p>
          <p>Your receipt is automatically generated. This is proof of your transaction.</p>
          <p className="rc-address">C. Jose corner Estanislao st., Malibay, Pasay City, Philippines, 1300</p>
        </footer>
      </article>

      <div className="rc-actions">
        <button type="button" className="btn btn-pink" onClick={() => window.print()}>
          Print / Save as PDF
        </button>
      </div>

      {/* after the receipt is saved or printed */}
      <Modal
        open={askAnother}
        centered
        closable={false}
        maskClosable={false}
        keyboard={false}
        title="Book another room?"
        footer={
          <div className="rc-modal-actions">
            <button type="button" className="btn btn-outline-teal" onClick={() => navigate('/')}>Back to Home</button>
            <button type="button" className="btn btn-pink" onClick={() => navigate('/book/room/pet-details')}>Yes, book another</button>
          </div>
        }
      >
        <p className="rc-modal-text">
          Your receipt is ready. Would you like to book another room for your fur baby?
        </p>
      </Modal>
    </PageShell>
  );
}

export default Receipt;