import { useEffect, useState } from 'react';
import axios from 'axios';
import { Alert, DatePicker, Input, Select, Table } from 'antd';
import AdminLayout, { fmtDate, fmtTime } from './AdminLayout';
import { API_URL } from '../../auth';

const ACTIONS = ['New User Registered', 'User Logged In', 'Account Created'];

const columns = [
  { title: 'Date', dataIndex: 'createdAt', width: 130, render: fmtDate },
  { title: 'Time', dataIndex: 'createdAt', width: 100, render: fmtTime },
  { title: 'Action', dataIndex: 'action' },
  { title: 'By', dataIndex: 'actorName' },
  { title: 'Details', dataIndex: 'details' },
];

function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // page, search, filter and date range: any change loads the list again from the server
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [action, setAction] = useState();
  const [range, setRange] = useState(null); // [dayjs, dayjs] or null

  useEffect(() => {
    setLoading(true);
    axios
      .get(`${API_URL}/admin/audit-logs`, {
        params: {
          page,
          pageSize,
          search,
          action,
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
  }, [page, pageSize, search, action, range]);

  // a new search or filter always starts at page 1
  const change = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  return (
    <AdminLayout title="Audit Logs" active="Audit Logs">
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <Input.Search
          allowClear
          placeholder="Search name, action or details"
          onSearch={change(setSearch)}
          style={{ width: 280 }}
        />
        <Select
          allowClear
          placeholder="All actions"
          options={ACTIONS.map((a) => ({ value: a, label: a }))}
          onChange={change(setAction)}
          style={{ width: 200 }}
        />
        <DatePicker.RangePicker onChange={change(setRange)} />
      </div>

      {error && <Alert type="error" showIcon title={error} style={{ marginBottom: 16 }} />}

      <Table
        rowKey="_id"
        columns={columns}
        dataSource={logs}
        loading={loading}
        scroll={{ x: true }}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          pageSizeOptions: [10, 20, 50],
          showTotal: (n) => `${n} entries`,
          onChange: (p, size) => {
            setPage(size !== pageSize ? 1 : p);
            setPageSize(size);
          },
        }}
      />
    </AdminLayout>
  );
}

export default AuditLogs;