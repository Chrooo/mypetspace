import { useEffect, useState } from 'react';
import axios from 'axios';
import { Alert, Input, Tooltip } from 'antd';
import AdminLayout from '../Admin/AdminLayout';
import DataTable, { Pills, SortSelect } from '../Admin/AdminUI';
import { API_URL } from '../../auth';

const PAGE_SIZE = 10;
const ROLES = [
  { label: 'Customers', value: 'customer' },
  { label: 'Staffs', value: 'staff' },
  { label: 'Groomers', value: 'groomer' },
];

// an account's login is an email OR a phone number: show it in the matching column
const columns = [
  { title: 'First Name', render: (u) => u.firstName },
  { title: 'Last Name', render: (u) => u.lastName },
  { title: 'Contact No.', bold: true, render: (u) => (u.identifier.includes('@') ? '' : u.identifier) },
  { title: 'E-mail', render: (u) => (u.identifier.includes('@') ? u.identifier : '') },
  {
    title: '',
    render: () => (
      <Tooltip title="Coming soon">
        <span className="adm-off">Edit</span>
      </Tooltip>
    ),
  },
];

function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [page, setPage] = useState(1);
  const [role, setRole] = useState('customer');
  const [sort, setSort] = useState();
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    axios
      .get(`${API_URL}/users`, { params: { page, pageSize: PAGE_SIZE, role, sort, search } })
      .then((response) => {
        setUsers(response.data.users);
        setTotal(response.data.total);
        setError('');
      })
      .catch((err) => setError(err.response?.data?.message || 'Could not load the users.'))
      .finally(() => setLoading(false));
  }, [page, role, sort, search]);

  // a new filter, sort or search always starts at page 1
  const reset = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  return (
    <AdminLayout>
      <div className="adm-head">
        <h1 className="adm-title">USERS</h1>
        <div className="adm-tools">
          <Pills options={ROLES} value={role} onChange={reset(setRole)} />
          <SortSelect value={sort} onChange={reset(setSort)} />
        </div>
      </div>

      <div className="adm-search">
        <Input.Search allowClear placeholder="Search name, email or phone" onSearch={reset(setSearch)} style={{ width: 300 }} />
      </div>

      {error && <Alert type="error" showIcon title={error} style={{ marginBottom: 16 }} />}

      <DataTable
        columns={columns}
        rows={users}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPage={setPage}
        loading={loading}
        empty="No users found."
      />
    </AdminLayout>
  );
}

export default ManageUsers;