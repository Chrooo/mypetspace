import { useEffect, useState } from 'react';
import axios from 'axios';
import { Alert, DatePicker, Input, InputNumber, Modal, Select, message } from 'antd';
import dayjs from 'dayjs';
import StaffLayout from '../Staff/StaffLayout';
import DataTable, { Pills } from '../Admin/AdminUI';
import { API_URL } from '../../auth';

const PAGE_SIZE = 10;
const TYPES = [
  { label: 'Hotel Reservations', value: 'hotel' },
  { label: 'Grooming Appointments', value: 'grooming' },
];
const STATUS_LABEL = { pending: 'Pending', confirmed: 'Confirmed', in_progress: 'In Progress', completed: 'Completed', cancelled: 'Cancelled' };
const STATUS_FILTER = [{ value: '', label: 'All statuses' }, ...Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label }))];
const PAYMENT_FILTER = [
  { value: '', label: 'All payments' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'paid', label: 'Paid' },
];
const METHODS = ['GCASH', 'MAYA', 'BANK', 'CASH'].map((m) => ({ value: m, label: m }));
const peso = (n) => `₱${Number(n || 0).toLocaleString('en-PH')}`;

// One page for bookings AND appointments.
//   Grooming Appointments: the schedule (groomer, status) and the payment (total, paid / unpaid) on the same row.
//   Hotel Reservations: the hotel payments recorded so far (there is no room reservation record yet).
function ManageBookings() {
  const [rows, setRows] = useState([]);
  const [groomers, setGroomers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [type, setType] = useState('grooming');
  const [status, setStatus] = useState('');
  const [payment, setPayment] = useState('');
  const [date, setDate] = useState(null);
  const [search, setSearch] = useState('');
  const [reload, setReload] = useState(0);

  const [paying, setPaying] = useState(null);
  const [method, setMethod] = useState('CASH');
  const [amount, setAmount] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    axios.get(`${API_URL}/staff/groomers`).then((r) => setGroomers(r.data.groomers)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const day = date ? date.format('YYYY-MM-DD') : undefined;
    const request =
      type === 'hotel'
        ? axios.get(`${API_URL}/staff/bookings`, { params: { page, pageSize: PAGE_SIZE, search, date: day } })
        : axios.get(`${API_URL}/staff/appointments`, { params: { page, pageSize: PAGE_SIZE, status, payment, search, date: day } });
    request
      .then((r) => {
        setRows(r.data.bookings || r.data.appointments);
        setTotal(r.data.total);
        setError('');
      })
      .catch((err) => setError(err.response?.data?.message || 'Could not load the bookings.'))
      .finally(() => setLoading(false));
  }, [page, type, status, payment, date, search, reload]);

  const reset = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  const update = (id, body) =>
    axios
      .put(`${API_URL}/staff/appointments/${id}`, body)
      .then(() => setReload((n) => n + 1))
      .catch((err) => message.error(err.response?.data?.message || 'Could not update the appointment.'));

  const openPay = (a) => {
    setPaying(a);
    setMethod('CASH');
    setAmount(a.total > 0 ? a.total : null);
  };

  const savePayment = async () => {
    setSaving(true);
    try {
      await axios.put(`${API_URL}/staff/bookings/${paying._id}/payment`, { method, total: amount });
      message.success('Payment recorded.');
      setPaying(null);
      setReload((n) => n + 1);
    } catch (err) {
      message.error(err.response?.data?.message || 'Could not record the payment.');
    } finally {
      setSaving(false);
    }
  };

  const payBadge = (s) => <span className={`adm-st ${s}`}>{s === 'paid' ? 'Paid' : 'Unpaid'}</span>;

  const groomingColumns = [
    { title: 'Date & Time', render: (a) => dayjs(a.scheduledAt).format('MMM DD, YYYY - h:mm A') },
    { title: 'Customer Name', render: (a) => a.customerName },
    { title: 'Pet Name', render: (a) => a.petName },
    { title: 'Services', render: (a) => a.services.join(', ') },
    {
      title: 'Groomer',
      render: (a) =>
        ['completed', 'cancelled'].includes(a.status) ? (
          a.groomerName
        ) : (
          <Select
            size="small"
            value={a.groomer}
            style={{ minWidth: 140 }}
            options={groomers.map((g) => ({ value: g._id, label: g.name }))}
            onChange={(groomer) => update(a._id, { groomer })}
            aria-label="Assign groomer"
          />
        ),
    },
    {
      title: 'Status',
      render: (a) =>
        a.nextStatuses.length === 0 ? (
          <span className={`adm-st ${a.status}`}>{STATUS_LABEL[a.status]}</span>
        ) : (
          <Select
            size="small"
            value={a.status}
            style={{ minWidth: 125 }}
            options={[a.status, ...a.nextStatuses].map((s) => ({ value: s, label: STATUS_LABEL[s] }))}
            onChange={(next) => update(a._id, { status: next })}
            aria-label="Update status"
          />
        ),
    },
    { title: 'Total', render: (a) => (a.total > 0 ? peso(a.total) : '—') },
    {
      title: 'Payment',
      render: (a) => (
        <>
          {payBadge(a.paymentStatus)}
          {a.paymentMethod ? ` (${a.paymentMethod})` : ''}
          {a.paymentStatus === 'unpaid' && a.status !== 'cancelled' && (
            <>
              <br />
              <button className="adm-act" onClick={() => openPay(a)}>Record payment</button>
            </>
          )}
        </>
      ),
    },
  ];

  const hotelColumns = [
    { title: 'Booking No.', bold: true, render: (b) => b.ref },
    { title: 'Date', render: (b) => dayjs(b.date).format('MMM DD, YYYY') },
    { title: 'Customer Name', render: (b) => b.customerName },
    { title: 'Booking', render: (b) => b.description },
    { title: 'Total', render: (b) => peso(b.total) },
    { title: 'Method', render: (b) => b.paymentMethod || '—' },
    { title: 'Transaction No.', render: (b) => b.transactionNo || '—' },
    { title: 'Payment', render: (b) => payBadge(b.paymentStatus) },
  ];

  return (
    <StaffLayout>
      <div className="adm-head">
        <div>
          <h1 className="adm-title">BOOKINGS</h1>
          <p className="adm-sub">Manage and update all bookings, appointments and payments.</p>
        </div>
        <div className="adm-tools">
          <Pills options={TYPES} value={type} onChange={(v) => { setType(v); setStatus(''); setPayment(''); setPage(1); }} />
          <DatePicker value={date} onChange={reset(setDate)} placeholder="Any date" format="MMM DD, YYYY" />
          {type === 'grooming' && (
            <>
              <Select value={status} onChange={reset(setStatus)} options={STATUS_FILTER} style={{ width: 150 }} aria-label="Filter by status" />
              <Select value={payment} onChange={reset(setPayment)} options={PAYMENT_FILTER} style={{ width: 140 }} aria-label="Filter by payment" />
            </>
          )}
        </div>
      </div>

      <div className="adm-search">
        <Input.Search allowClear placeholder="Search customer, pet or service" onSearch={reset(setSearch)} style={{ width: 300 }} />
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
        empty={type === 'hotel' ? 'No hotel payments recorded yet.' : 'No appointments found.'}
      />

      <Modal
        open={!!paying}
        title={paying ? `Record payment - ${paying.petName} (${paying.customerName})` : ''}
        okText="Save payment"
        confirmLoading={saving}
        okButtonProps={{ disabled: !(amount > 0) }}
        onOk={savePayment}
        onCancel={() => setPaying(null)}
      >
        {paying && (
          <div style={{ display: 'grid', gap: 12 }}>
            <div>{paying.services.join(', ')}</div>
            <label>
              Amount paid (₱)
              <InputNumber min={1} value={amount} onChange={setAmount} style={{ width: '100%' }} />
            </label>
            <label>
              Paid by
              <Select value={method} onChange={setMethod} options={METHODS} style={{ width: '100%' }} />
            </label>
          </div>
        )}
      </Modal>
    </StaffLayout>
  );
}

export default ManageBookings;