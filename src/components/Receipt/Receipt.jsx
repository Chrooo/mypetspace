import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Modal } from 'antd';
import PageShell from '../Layout/PageShell';
import logo from '../../assets/logo.png';
import { readReceipt } from './receiptData';
import './Receipt.css';

const peso = (n) => `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const TBC = 'To be confirmed by the shop';

// The receipt made when "Pay Now" is pressed (see Booking/Payment.jsx and receiptData.js).
// Print / Save as PDF opens the print window; when it closes, the "book another?" pop-up appears.
// Opened from My Payments and Payments and Receipts with another id (like "sample"), it still shows
// the planned page, because nothing saves receipts on the server yet.
function Receipt() {
  const { id } = useParams();
  const navigate = useNavigate();
  const receipt = readReceipt(id);
  const [askAnother, setAskAnother] = useState(false);

  // the print / save window was closed -> ask if the customer wants to book another room
  useEffect(() => {
    if (!receipt) return undefined;
    const onAfterPrint = () => setAskAnother(true);
    window.addEventListener('afterprint', onAfterPrint);
    return () => window.removeEventListener('afterprint', onAfterPrint);
  }, [receipt]);

  if (!receipt) {
    return (
      <PageShell
        title="Receipt"
        subtitle={`Receipt: ${id}`}
        planned={[
          'Receipt number (like MPS-2026-000001), date and time',
          'Customer, pet and booking reference',
          'Items: services or room nights with price',
          'Total, amount paid in this receipt and remaining balance',
          'Payment method and reference number',
          'Verified by (staff name) and shop details',
        ]}
      >
        <div className="page-actions" style={{ marginTop: 0, marginBottom: 28 }}>
          <button type="button" className="btn btn-pink" onClick={() => window.print()}>
            Print / Save as PDF
          </button>
          <Link to="/dashboard" className="btn btn-outline-teal">Back to dashboard</Link>
        </div>
      </PageShell>
    );
  }

  const r = receipt;
  const hasTotal = typeof r.total === 'number';
  const paid = typeof r.paid === 'number' ? r.paid : 0;
  const remaining = hasTotal ? Math.max(r.total - paid, 0) : null;

  const rows = [
    ['Room:', r.roomName],
    ['Dates:', r.datesText],
    ['Pet/s:', r.petText],
    ['Slot:', `Slot ${r.slot}`],
    ['Check-In:', r.checkIn],
    ['Check-Out:', r.checkOut],
    ['Price:', r.priceText],
    ['Booking No.:', r.bookingNo],
  ];

  return (
    <PageShell title="Receipt" subtitle="This is your receipt.">
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
            <button type="button" className="btn btn-outline-teal" onClick={() => navigate('/')}>No</button>
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