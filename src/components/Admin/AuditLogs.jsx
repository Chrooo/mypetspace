import { useEffect, useState } from 'react';
import axios from 'axios';
import { Alert, DatePicker, Input } from 'antd';
import AdminLayout from './AdminLayout';
import DataTable, { Pills, SortSelect, fmtDateTime } from './AdminUI';
import { API_URL } from '../../auth';

const PAGE_SIZE = 10;
const ROLES = [
  { label: 'All', value: '' },
  { label: 'Admin', value: 'admin' },
  { label: 'Customers', value: 'customer' },
  { label: 'Staffs', value: 'staff' },
  { label: 'Groomers', value: 'groomer' },
];

const ROLE_NAMES = { admin: 'Admin', staff: 'Staff', groomer: 'Groomer', customer: 'Customer' };

const columns = [
  { title: 'Log ID', bold: true, render: (r) => `LOG-${r._id.slice(-6).toUpperCase()}` },
  { title: 'Name', bold: true, render: (r) => r.actorName },
  { title: 'Role', render: (r) => ROLE_NAMES[r.actorRole] || '' },
  { title: 'Activity', render: (r) => r.action },
  { title: 'Affected', render: (r) => r.affected },
  { title: 'Date & Time', bold: true, render: (r) => fmtDateTime(r.createdAt) },
  { title: 'Status', render: (r) => <span className={r.status === 'failed' ? 'adm-bad' : 'adm-ok'}>{r.status}</span> },
];

function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // page, role pill, sort, search and date range: any change loads the list again from the server
  const [page, setPage] = useState(1);
  const [role, setRole] = useState('');
  const [sort, setSort] = useState();
  const [search, setSearch] = useState('');
  const [range, setRange] = useState(null);

  useEffect(() => {
    setLoading(true);
    axios
      .get(`${API_URL}/admin/audit-logs`, {
        params: {
          page,
          pageSize: PAGE_SIZE,
          role,
          sort,
          search,
          from: range?.[0]?.format('YYYY-MM-DD'),
          to: range?.[1]?.format('YYYY-MM-DD'),
        },
      })
      .then((response) => {
        setLogs(response.data.logs);
        setTotal(response.data.total);
        setError('');
      })
      .catch((err) => setError(err.response?.data?.message || 'Could not load the audit logs.'))
      .finally(() => setLoading(false));
  }, [page, role, sort, search, range]);

  // a new filter, sort or search always starts at page 1
  const reset = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  return (
    <AdminLayout>
      <div className="adm-head">
        <div>
          <h1 className="adm-title">AUDIT LOGS</h1>
          <p className="adm-sub">Activity History</p>
        </div>
        <div className="adm-tools">
          <Pills options={ROLES} value={role} onChange={reset(setRole)} />
          <SortSelect value={sort} onChange={reset(setSort)} />
        </div>
      </div>

      <div className="adm-search">
        <Input.Search allowClear placeholder="Search name, activity or affected" onSearch={reset(setSearch)} style={{ width: 300 }} />
        <DatePicker.RangePicker onChange={reset(setRange)} />
      </div>

      {error && <Alert type="error" showIcon title={error} style={{ marginBottom: 16 }} />}

      <DataTable
        columns={columns}
        rows={logs}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPage={setPage}
        loading={loading}
        empty="No activity found."
      />
    </AdminLayout>
  );
}

export default AuditLogs;