import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Alert, DatePicker, Input, InputNumber, Modal, Select, message } from 'antd';
import dayjs from 'dayjs';
import StaffLayout from '../Staff/StaffLayout';
import DataTable, { Pills } from '../Admin/AdminUI';
import NewBookingModal from './NewBookingModal';
import { stayText } from './ManageReservations';
import { API_URL } from '../../auth';

const PAGE_SIZE = 5;
const TYPES = [
  { label: 'Hotel Reservations', value: 'hotel' },
  { label: 'Grooming Appointments', value: 'grooming' },
];
const STATUS_LABEL = { pending: 'Pending', confirmed: 'Confirmed', in_progress: 'In Progress', checked_in: 'Checked In', completed: 'Completed', cancelled: 'Cancelled' };
// the Filter drop-down, in the order of the design (hotel stays have "Checked In" instead of "In Progress")
const FILTERS = {
  grooming: ['confirmed', 'pending', 'cancelled', 'in_progress', 'completed'],
  hotel: ['confirmed', 'pending', 'cancelled', 'checked_in', 'completed'],
};
const METHODS = ['CASH', 'GCASH', 'MAYA', 'BANK'].map((m) => ({ value: m, label: m }));
const peso = (n) => `₱${Number(n || 0).toLocaleString('en-PH')}`;

// One page for bookings AND appointments (design: "Staff Bookings").
//   Table: No., Date & Time, Customer, Pet, Services / Room, Groomer / Stay, Status, Action (View | Confirm).
//   View opens the details window: change the status, assign the groomer, record a payment, open the receipt.
//   Confirm turns a Pending booking into Confirmed.
//   New booking: staff book for a walk-in or phone customer, with cash (or other) payment taken on the spot.
function ManageBookings() {
  const [rows, setRows] = useState([]);
  const [groomers, setGroomers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [type, setType] = useState('grooming');
  const [status, setStatus] = useState('');
  const [date, setDate] = useState(null);
  const [search, setSearch] = useState('');
  const [reload, setReload] = useState(0);

  const [viewId, setViewId] = useState(null); // the booking open in the details window
  const [paying, setPaying] = useState(false);
  const [method, setMethod] = useState('CASH');
  const [amount, setAmount] = useState(null);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [confirming, setConfirming] = useState(null); // the Pending booking whose Confirm window is open

  useEffect(() => {
    axios.get(`${API_URL}/staff/groomers`).then((r) => setGroomers(r.data.groomers)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const day = date ? date.format('YYYY-MM-DD') : undefined;
    const request =
      type === 'hotel'
        ? axios.get(`${API_URL}/staff/reservations`, { params: { page, pageSize: PAGE_SIZE, status, search, date: day } })
        : axios.get(`${API_URL}/staff/appointments`, { params: { page, pageSize: PAGE_SIZE, status, search, date: day } });
    request
      .then((r) => {
        setRows(r.data.reservations || r.data.appointments);
        setTotal(r.data.total);
        setError('');
      })
      .catch((err) => setError(err.response?.data?.message || 'Could not load the bookings.'))
      .finally(() => setLoading(false));
  }, [page, type, status, date, search, reload]);

  const refresh = () => setReload((n) => n + 1);
  const reset = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  const url = (b) => (type === 'hotel' ? `${API_URL}/staff/reservations/${b._id}` : `${API_URL}/staff/appointments/${b._id}`);
  const update = (b, body, ok) =>
    axios
      .put(url(b), body)
      .then(() => {
        if (ok) message.success(ok);
        refresh();
      })
      .catch((err) => message.error(err.response?.data?.message || 'Could not update the booking.'));

  const cancelIt = (b) =>
    Modal.confirm({
      title: 'Cancel this booking?',
      content: `${b.petName} (${b.customerName}). ${type === 'hotel' ? 'The slot is given back. ' : ''}Refunds are handled with the customer.`,
      okText: 'Cancel booking',
      cancelText: 'Keep it',
      okButtonProps: { danger: true },
      centered: true,
      onOk: () => update(b, { status: 'cancelled' }, 'Booking cancelled.'),
    });

  const onStatus = (b, next) => (next === 'cancelled' ? cancelIt(b) : update(b, { status: next }));

  const openPay = (b) => {
    setMethod('CASH');
    setAmount(b.total > 0 ? b.total : null);
    setPaying(true);
  };
  const savePayment = async (b) => {
    setSaving(true);
    try {
      await axios.put(`${API_URL}/staff/bookings/${b._id}/payment`, { method, total: amount });
      message.success('Payment recorded.');
      setPaying(false);
      refresh();
    } catch (err) {
      message.error(err.response?.data?.message || 'Could not record the payment.');
    } finally {
      setSaving(false);
    }
  };

  // ---- Confirm: the payment window comes first ----
  // hotel: what is still to pay (null = Peak/Holiday, the shop has not set the price yet)
  // grooming: the price worked out from the pet's weight (0 = could not be worked out)
  const dueOf = (b) => (type === 'hotel' ? (b.total > 0 ? b.balance : null) : b.paymentStatus === 'paid' ? 0 : b.total > 0 ? b.total : null);
  const needsAmount = (b) => (type === 'hotel' ? !(b.total > 0) : b.paymentStatus !== 'paid' && !(b.total > 0));
  const openConfirm = (b) => {
    setMethod('CASH');
    setAmount(needsAmount(b) ? null : dueOf(b));
    setConfirming(b);
  };
  const closeConfirm = () => setConfirming(null);

  const confirmOnly = async (b) => {
    setSaving(true);
    try {
      await axios.put(url(b), { status: 'confirmed' });
      message.success('Booking confirmed.');
      closeConfirm();
      refresh();
    } catch (err) {
      message.error(err.response?.data?.message || 'Could not confirm the booking.');
    } finally {
      setSaving(false);
    }
  };
  const payAndConfirm = async (b) => {
    setSaving(true);
    try {
      if (type === 'hotel') {
        await axios.put(url(b), { status: 'confirmed', payBalance: method, total: needsAmount(b) ? amount : undefined });
      } else {
        await axios.put(`${API_URL}/staff/bookings/${b._id}/payment`, { method, total: amount, confirm: true });
      }
      message.success('Payment recorded and booking confirmed.');
      closeConfirm();
      refresh();
    } catch (err) {
      message.error(err.response?.data?.message || 'Could not record the payment.');
    } finally {
      setSaving(false);
    }
  };

  const viewing = rows.find((r) => r._id === viewId) || null;
  const statusText = (b) => <span className={`adm-st ${b.status}`}>{STATUS_LABEL[b.status]}</span>;
  const actions = (b) => <button className="adm-act" onClick={() => setViewId(b._id)}>View</button>;
  const confirm = (b) =>
    b.status === 'pending' ? (
      <button className="adm-act" onClick={() => openConfirm(b)}>Confirm</button>
    ) : null;

  const groomingColumns = [
    { title: 'Date & Time', render: (a) => dayjs(a.scheduledAt).format('MMM DD, YYYY - h:mm A') },
    { title: 'Customer Name', render: (a) => a.customerName },
    { title: 'Pet Name', render: (a) => a.petName },
    { title: 'Services', render: (a) => a.services.join(', ') },
    { title: 'Groomer', render: (a) => a.groomerName || '—' },
    { title: 'Status', render: statusText },
    { title: 'Action', render: actions },
    { title: 'Confirm', joinPrev: true, render: confirm },
  ];
  const hotelColumns = [
    { title: 'Check-in', render: (r) => dayjs(r.checkInAt).format('MMM DD, YYYY - h:mm A') },
    { title: 'Customer Name', render: (r) => r.customerName },
    { title: 'Pet Name', render: (r) => r.petName },
    { title: 'Room', render: (r) => `${r.roomName} (Slot ${r.slot})` },
    { title: 'Stay', render: stayText },
    { title: 'Status', render: statusText },
    { title: 'Action', render: actions },
    { title: 'Confirm', joinPrev: true, render: confirm },
  ];

  const detail = (b) =>
    type === 'hotel'
      ? [
          ['Booking No.', b.ref],
          ['Customer', b.customerName],
          ['Pet', `${b.petName} (${b.petType}${b.petBreed ? `, ${b.petBreed}` : ''})`],
          ['Room', `${b.roomName} (Slot ${b.slot})`],
          ['Stay', stayText(b)],
          ['Total', b.total > 0 ? peso(b.total) : 'To be set by the shop'],
          ['Paid', b.paid > 0 ? `${peso(b.paid)}${b.paymentMethod ? ` via ${b.paymentMethod}` : ''}` : 'Nothing yet'],
          ['Balance', b.balance === null ? '—' : peso(b.balance)],
        ]
      : [
          ['Customer', b.customerName],
          ['Pet', `${b.petName} (${b.petType}${b.petBreed ? `, ${b.petBreed}` : ''})`],
          ['Weight', b.petWeight ? `${b.petWeight} kg` : 'Not given'],
          ['Services', b.services.join(', ')],
          ['Appointment', dayjs(b.scheduledAt).format('MMM DD, YYYY - h:mm A')],
          ['Total', b.total > 0 ? peso(b.total) : 'Not set yet'],
          ['Payment', b.paymentStatus === 'paid' ? `Paid${b.paymentMethod ? ` via ${b.paymentMethod}` : ''}` : 'Unpaid'],
        ];
  const receiptLink = (b) =>
    type === 'hotel' ? b.receiptNo : b.paymentStatus === 'paid' ? `G-${String(b._id).slice(-8).toUpperCase()}` : null;

  return (
    <StaffLayout>
      <div className="adm-head">
        <div>
          <h1 className="adm-title">BOOKINGS</h1>
          <p className="adm-sub">Manage and update all bookings.</p>
        </div>
        <div className="adm-tools">
          <Pills options={TYPES} value={type} onChange={(v) => { setType(v); setStatus(''); setPage(1); }} />
          <DatePicker value={date} onChange={reset(setDate)} placeholder="Any date" format="MMM DD, YYYY" />
          <Select
            value={status || undefined}
            placeholder="Filter"
            onChange={(v) => reset(setStatus)(v === 'all' ? '' : v)}
            options={[...FILTERS[type].map((s) => ({ value: s, label: STATUS_LABEL[s] })), { value: 'all', label: 'All' }]}
            style={{ width: 140 }}
            aria-label="Filter by status"
          />
        </div>
      </div>

      <div className="adm-search" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <Input.Search allowClear placeholder="Search customer, pet or service" onSearch={reset(setSearch)} style={{ width: 300 }} />
        <button type="button" className="btn btn-pink" onClick={() => setCreating(true)}>+ New booking</button>
      </div>

      {error && <Alert type="error" showIcon title={error} style={{ marginBottom: 16 }} />}

      <DataTable
        columns={type === 'hotel' ? hotelColumns : groomingColumns}
        rows={rows}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPage={setPage}
        loading={loading}
        empty={type === 'hotel' ? 'No hotel reservations found.' : 'No appointments found.'}
      />

      {/* View: everything about one booking, and what staff can do with it */}
      <Modal open={!!viewing} title="Booking Details" footer={null} centered onCancel={() => { setViewId(null); setPaying(false); }}>
        {viewing && (
          <>
            <dl className="mb-details" style={{ display: 'grid', gap: 6, margin: 0 }}>
              {detail(viewing).map(([k, v]) => (
                <div key={k} style={{ display: 'grid', gridTemplateColumns: '38% 1fr', gap: 8 }}>
                  <dt style={{ fontWeight: 700 }}>{k}</dt>
                  <dd style={{ margin: 0 }}>{v}</dd>
                </div>
              ))}
            </dl>

            <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
              <label>
                Status{' '}
                {viewing.nextStatuses.length === 0 ? (
                  statusText(viewing)
                ) : (
                  <Select size="small" value={viewing.status} style={{ minWidth: 150 }} onChange={(next) => onStatus(viewing, next)}
                    options={[viewing.status, ...viewing.nextStatuses].map((s) => ({ value: s, label: STATUS_LABEL[s] }))} />
                )}
              </label>

              {type === 'grooming' && !['completed', 'cancelled'].includes(viewing.status) && (
                <label>
                  Groomer{' '}
                  <Select size="small" value={viewing.groomer} style={{ minWidth: 180 }} onChange={(groomer) => update(viewing, { groomer })}
                    options={groomers.map((g) => ({ value: g._id, label: g.name }))} />
                </label>
              )}

              {type === 'grooming' && viewing.paymentStatus === 'unpaid' && viewing.status !== 'cancelled' && !paying && (
                <button type="button" className="btn btn-pink" onClick={() => openPay(viewing)}>Record payment</button>
              )}
              {paying && (
                <div style={{ display: 'grid', gap: 8, padding: 12, border: '1px dashed #bbb', borderRadius: 8 }}>
                  <label>Amount paid (₱) <InputNumber min={1} value={amount} onChange={setAmount} style={{ width: '100%' }} /></label>
                  <label>Paid by <Select value={method} onChange={setMethod} options={METHODS} style={{ width: '100%' }} /></label>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button type="button" className="btn btn-outline-teal" onClick={() => setPaying(false)}>Cancel</button>
                    <button type="button" className="btn btn-pink" disabled={!(amount > 0) || saving} onClick={() => savePayment(viewing)}>Save payment</button>
                  </div>
                </div>
              )}
              {type === 'hotel' && viewing.status !== 'cancelled' && (viewing.balance === null || viewing.balance > 0) && (
                <Link to="/manage/reservations" className="btn btn-pink">Record payment on Hotel Stays</Link>
              )}
              {receiptLink(viewing) && <Link to={`/receipts/${receiptLink(viewing)}`} className="adm-act">Open receipt</Link>}
            </div>
          </>
        )}
      </Modal>

      {/* Confirm: take the payment first, then the booking becomes Confirmed */}
      <Modal open={!!confirming} title="Confirm booking" footer={null} centered onCancel={closeConfirm}>
        {confirming && (() => {
          const b = confirming;
          const due = dueOf(b);
          const settled = due === 0; // nothing left to collect (already paid)
          const lockAmount = type === 'hotel' ? !needsAmount(b) : false; // a hotel pays the balance; grooming staff can correct the amount
          const payable = Number(amount) > 0;
          return (
            <div style={{ display: 'grid', gap: 12 }}>
              <dl className="mb-details" style={{ display: 'grid', gap: 6, margin: 0 }}>
                {(type === 'hotel'
                  ? [['Customer', b.customerName], ['Pet', b.petName], ['Room', `${b.roomName} (Slot ${b.slot})`], ['Stay', stayText(b)],
                     ['Total', b.total > 0 ? peso(b.total) : 'To be set by the shop'], ['Already paid', peso(b.paid)]]
                  : [['Customer', b.customerName], ['Pet', `${b.petName}${b.petWeight ? ` (${b.petWeight} kg)` : ''}`], ['Services', b.services.join(', ')]]
                ).map(([k, v]) => (
                  <div key={k} style={{ display: 'grid', gridTemplateColumns: '38% 1fr', gap: 8 }}>
                    <dt style={{ fontWeight: 700 }}>{k}</dt>
                    <dd style={{ margin: 0 }}>{v}</dd>
                  </div>
                ))}
              </dl>

              {settled ? (
                <Alert type="success" showIcon title={type === 'hotel' ? 'This stay is fully paid.' : 'This booking is already paid.'} />
              ) : (
                <div style={{ display: 'grid', gap: 8, padding: 12, border: '1px dashed #bbb', borderRadius: 8 }}>
                  <b>{needsAmount(b) ? (type === 'hotel' ? 'Set the price of the stay' : 'Enter the amount') : `Amount to pay: ${peso(due)}`}</b>
                  {type === 'grooming' && !b.petWeight && <small>This pet has no weight on file, so the price could not be worked out.</small>}
                  <label>
                    Amount (₱)
                    <InputNumber min={1} value={amount} onChange={setAmount} disabled={lockAmount} style={{ width: '100%' }} />
                  </label>
                  <label>
                    Paid by
                    <Select value={method} onChange={setMethod} options={METHODS} style={{ width: '100%' }} />
                  </label>
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <button type="button" className="btn btn-outline-teal" onClick={closeConfirm}>Cancel</button>
                {settled ? (
                  <button type="button" className="btn btn-pink" disabled={saving} onClick={() => confirmOnly(b)}>Confirm booking</button>
                ) : (
                  <>
                    <button type="button" className="btn btn-outline-teal" disabled={saving} onClick={() => confirmOnly(b)}>Confirm without payment</button>
                    <button type="button" className="btn btn-pink" disabled={!payable || saving} onClick={() => payAndConfirm(b)}>Record payment &amp; confirm</button>
                  </>
                )}
              </div>
            </div>
          );
        })()}
      </Modal>

      <NewBookingModal
        open={creating}
        initialType={type}
        onClose={() => setCreating(false)}
        onCreated={(made) => {
          if (made !== type) setType(made);
          setStatus('');
          setPage(1);
          refresh();
        }}
      />
    </StaffLayout>
  );
}

export default ManageBookings;