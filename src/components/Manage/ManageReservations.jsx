import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Alert, DatePicker, Input, InputNumber, Modal, Select, message } from 'antd';
import dayjs from 'dayjs';
import StaffLayout from '../Staff/StaffLayout';
import DataTable from '../Admin/AdminUI';
import { API_URL } from '../../auth';

const PAGE_SIZE = 10;
const STATUS_LABEL = { pending: 'Pending', confirmed: 'Confirmed', checked_in: 'Checked In', completed: 'Completed', cancelled: 'Cancelled' };
const STATUS_FILTER = [{ value: '', label: 'All statuses' }, ...Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label }))];
const METHODS = ['CASH', 'GCASH', 'MAYA', 'BANK', 'CARD'].map((m) => ({ value: m, label: m }));
const peso = (n) => `₱${Number(n || 0).toLocaleString('en-PH')}`;

// "Nov 06 - Nov 08, 2026 (2 nights)"  /  "Nov 06, 2026 10:00 AM - 4:00 PM (6 hrs)"
export const stayText = (r) => {
  const day = (d, y) => dayjs(d).format(y ? 'MMM DD, YYYY' : 'MMM DD');
  if (r.nights > 0) return `${day(r.startDate)} - ${day(r.endDate, true)} (${r.nights} ${r.nights === 1 ? 'night' : 'nights'})`;
  return `${day(r.startDate, true)} ${dayjs(r.checkInAt).format('h:mm A')}${r.checkOutAt ? ` - ${dayjs(r.checkOutAt).format('h:mm A')}` : ''} (${r.hours} hrs)`;
};

// Hotel Stays: every room reservation. Staff confirm it, check the pet in and out, cancel it (this frees the slot),
// set the price of a Peak/Holiday stay, record the balance the customer pays at the shop, and open the receipt.
function ManageReservations() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [date, setDate] = useState(null);
  const [search, setSearch] = useState('');
  const [reload, setReload] = useState(0);

  const [paying, setPaying] = useState(null); // the reservation in the "Record payment" window
  const [method, setMethod] = useState('CASH');
  const [price, setPrice] = useState(null); // Peak/Holiday: the price the shop sets
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    axios
      .get(`${API_URL}/staff/reservations`, { params: { page, pageSize: PAGE_SIZE, status, search, date: date ? date.format('YYYY-MM-DD') : undefined } })
      .then((r) => {
        setRows(r.data.reservations);
        setTotal(r.data.total);
        setError('');
      })
      .catch((err) => setError(err.response?.data?.message || 'Could not load the reservations.'))
      .finally(() => setLoading(false));
  }, [page, status, date, search, reload]);

  const reset = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  const send = (id, body, ok) =>
    axios
      .put(`${API_URL}/staff/reservations/${id}`, body)
      .then(() => {
        if (ok) message.success(ok);
        setReload((n) => n + 1);
      })
      .catch((err) => {
        message.error(err.response?.data?.message || 'Could not update the reservation.');
        throw err;
      });

  const changeStatus = (r, next) => {
    if (next === 'cancelled') {
      Modal.confirm({
        title: 'Cancel this stay?',
        content: `${r.petName} (${r.customerName}) - ${r.roomName}. The slot is given back. Refunds are handled with the customer.`,
        okText: 'Cancel stay',
        cancelText: 'Keep it',
        okButtonProps: { danger: true },
        centered: true,
        onOk: () => send(r._id, { status: next }, 'Stay cancelled.').catch(() => {}),
      });
      return;
    }
    send(r._id, { status: next }).catch(() => {});
  };

  const openPay = (r) => {
    setPaying(r);
    setMethod('CASH');
    setPrice(null);
  };

  const needsPrice = paying && !(paying.total > 0);
  const savePayment = async () => {
    setSaving(true);
    try {
      if (needsPrice) await send(paying._id, { total: price }); // set the Peak/Holiday price first
      if (!needsPrice || price) await send(paying._id, { payBalance: method }, 'Payment recorded.');
      setPaying(null);
    } catch (err) {
      /* the message was already shown */
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { title: 'Booking No.', bold: true, render: (r) => r.ref },
    { title: 'Customer Name', render: (r) => r.customerName },
    { title: 'Pet Name', render: (r) => r.petName },
    { title: 'Room', render: (r) => `${r.roomName} (Slot ${r.slot})` },
    { title: 'Stay', render: stayText },
    { title: 'Total', render: (r) => (r.total > 0 ? peso(r.total) : 'TBC') },
    {
      title: 'Payment',
      render: (r) => (
        <>
          {r.total > 0 && r.balance === 0 ? <span className="adm-st paid">Paid</span> : r.paid > 0 ? <span className="adm-st pending">Partial</span> : <span className="adm-st unpaid">Unpaid</span>}
          {r.total > 0 && r.balance > 0 && <small style={{ display: 'block' }}>{peso(r.balance)} left</small>}
          {r.status !== 'cancelled' && (r.balance === null || r.balance > 0) && (
            <button className="adm-act" onClick={() => openPay(r)}>Record payment</button>
          )}
        </>
      ),
    },
    {
      title: 'Status',
      render: (r) =>
        r.nextStatuses.length === 0 ? (
          <span className={`adm-st ${r.status}`}>{STATUS_LABEL[r.status]}</span>
        ) : (
          <Select
            size="small"
            value={r.status}
            style={{ minWidth: 125 }}
            options={[r.status, ...r.nextStatuses].map((s) => ({ value: s, label: STATUS_LABEL[s] }))}
            onChange={(next) => changeStatus(r, next)}
            aria-label="Update status"
          />
        ),
    },
    { title: 'Receipt', render: (r) => (r.receiptNo ? <Link to={`/receipts/${r.receiptNo}`} className="adm-act">View</Link> : '—') },
  ];

  return (
    <StaffLayout>
      <div className="adm-head">
        <div>
          <h1 className="adm-title">HOTEL STAYS</h1>
          <p className="adm-sub">Confirm reservations, check pets in and out, and record payments.</p>
        </div>
        <div className="adm-tools">
          <DatePicker value={date} onChange={reset(setDate)} placeholder="Any date" format="MMM DD, YYYY" />
          <Select value={status} onChange={reset(setStatus)} options={STATUS_FILTER} style={{ width: 150 }} aria-label="Filter by status" />
        </div>
      </div>

      <div className="adm-search">
        <Input.Search allowClear placeholder="Search customer, pet or room" onSearch={reset(setSearch)} style={{ width: 300 }} />
      </div>

      {error && <Alert type="error" showIcon title={error} style={{ marginBottom: 16 }} />}

      <DataTable columns={columns} rows={rows} page={page} pageSize={PAGE_SIZE} total={total} onPage={setPage} loading={loading} empty="No hotel reservations found." />

      <Modal
        open={!!paying}
        title={paying ? `Record payment - ${paying.petName} (${paying.customerName})` : ''}
        okText="Save payment"
        confirmLoading={saving}
        okButtonProps={{ disabled: needsPrice && !(price > 0) }}
        onOk={savePayment}
        onCancel={() => setPaying(null)}
      >
        {paying && (
          <div style={{ display: 'grid', gap: 12 }}>
            <div>{paying.roomName} - {stayText(paying)}</div>
            {needsPrice ? (
              <label>
                Price of the whole stay (₱) - Peak/Holiday
                <InputNumber min={1} value={price} onChange={setPrice} style={{ width: '100%' }} />
              </label>
            ) : (
              <div>Total {peso(paying.total)} - already paid {peso(paying.paid)} - <b>to collect {peso(paying.balance)}</b></div>
            )}
            <label>
              Paid by
              <Select value={method} onChange={setMethod} options={METHODS} style={{ width: '100%' }} />
            </label>
            <small>This marks the stay as fully paid and updates the customer&apos;s receipt.</small>
          </div>
        )}
      </Modal>
    </StaffLayout>
  );
}

export default ManageReservations;