import { useEffect, useState } from 'react';
import axios from 'axios';
import { Alert, DatePicker, Input } from 'antd';
import AdminLayout from './AdminLayout';
import DataTable, { SortSelect, fmtDateTime } from './AdminUI';
import { API_URL } from '../../auth';

const PAGE_SIZE = 10;
const METHODS = { GCASH: 'G-CASH', MAYA: 'MAYA', BANK: 'BANK', CASH: 'CASH' };

const columns = [
  { title: 'Name', bold: true, render: (r) => r.customerName },
  { title: 'Amount', render: (r) => `₱ ${Number(r.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}` },
  { title: 'Date & Time', bold: true, render: (r) => fmtDateTime(r.createdAt) },
  { title: 'MOP', render: (r) => METHODS[r.method] || r.method },
  { title: 'Transaction No.', render: (r) => r.transactionNo },
];

function AdminPayments() {
  const [payments, setPayments] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [page, setPage] = useState(1);
  const [sort, setSort] = useState();
  const [search, setSearch] = useState('');
  const [range, setRange] = useState(null);

  useEffect(() => {
    setLoading(true);
    axios
      .get(`${API_URL}/admin/payments`, {
        params: {
          page,
          pageSize: PAGE_SIZE,
          sort,
          search,
          from: range?.[0]?.format('YYYY-MM-DD'),
          to: range?.[1]?.format('YYYY-MM-DD'),
        },
      })
      .then((response) => {
        setPayments(response.data.payments);
        setTotal(response.data.total);
        setError('');
      })
      .catch((err) => setError(err.response?.data?.message || 'Could not load the payments.'))
      .finally(() => setLoading(false));
  }, [page, sort, search, range]);

  const reset = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  return (
    <AdminLayout>
      <div className="adm-head">
        <div>
          <h1 className="adm-title">PAYMENTS</h1>
          <p className="adm-sub">Payments History of Hotel Bookings</p>
        </div>
        <div className="adm-tools">
          <SortSelect value={sort} onChange={reset(setSort)} />
        </div>
      </div>

      <div className="adm-search">
        <Input.Search allowClear placeholder="Search name or transaction no." onSearch={reset(setSearch)} style={{ width: 300 }} />
        <DatePicker.RangePicker onChange={reset(setRange)} />
      </div>

      {error && <Alert type="error" showIcon title={error} style={{ marginBottom: 16 }} />}

      <DataTable
        columns={columns}
        rows={payments}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPage={setPage}
        loading={loading}
        empty="No payments yet. They will show here once hotel bookings are paid."
      />
    </AdminLayout>
  );
}

export default AdminPayments;