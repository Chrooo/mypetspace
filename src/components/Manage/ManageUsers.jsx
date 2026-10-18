import { useEffect, useState } from 'react';
import axios from 'axios';
import { Alert, Input, Modal } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import AdminLayout from '../Admin/AdminLayout';
import DataTable, { Pills, SortSelect } from '../Admin/AdminUI';
import { API_URL, ROLE_LABELS } from '../../auth';

const PAGE_SIZE = 10;
const ROLES = [
  { label: 'Customers', value: 'customer' },
  { label: 'Staffs', value: 'staff' },
  { label: 'Groomers', value: 'groomer' },
];

const formatDate = (iso) => {
  const d = new Date(iso);
  return !iso || Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [page, setPage] = useState(1);
  const [role, setRole] = useState('customer');
  const [sort, setSort] = useState();
  const [search, setSearch] = useState('');

  // the account being viewed: { user, pets } (loaded when "View" is pressed)
  const [viewing, setViewing] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState('');

  const openView = (row) => {
    setViewing({ user: row, pets: [] });
    setViewLoading(true);
    setViewError('');
    axios
      .get(`${API_URL}/users/${row._id}`)
      .then((response) => setViewing(response.data))
      .catch((err) => setViewError(err.response?.data?.message || 'Could not load this account.'))
      .finally(() => setViewLoading(false));
  };

  // an account's login is an email OR a phone number: show it in the matching column
  const columns = [
    { title: 'First Name', render: (u) => u.firstName },
    { title: 'Last Name', render: (u) => u.lastName },
    { title: 'Contact No.', bold: true, render: (u) => (u.identifier.includes('@') ? '' : u.identifier) },
    { title: 'E-mail', render: (u) => (u.identifier.includes('@') ? u.identifier : '') },
    {
      title: '',
      render: (u) => (
        <button type="button" className="adm-act" onClick={() => openView(u)}>
          View
        </button>
      ),
    },
  ];

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

      <Modal open={!!viewing} title="Account information" footer={null} onCancel={() => setViewing(null)} centered>
        {viewError && <Alert type="error" showIcon title={viewError} style={{ marginBottom: 12 }} />}
        {viewing && (
          <div className="adm-view">
            <div className="adm-view-photo">
              {viewing.user.avatar ? <img src={viewing.user.avatar} alt="" /> : <UserOutlined />}
            </div>
            <dl>
              <dt>Full Name</dt>
              <dd>{viewing.user.firstName} {viewing.user.lastName}</dd>
              <dt>{viewing.user.identifier.includes('@') ? 'E-mail' : 'Contact No.'}</dt>
              <dd>{viewing.user.identifier}</dd>
              <dt>Role</dt>
              <dd>{(ROLE_LABELS[viewing.user.role] || {}).label || viewing.user.role}</dd>
              <dt>Status</dt>
              <dd>Active</dd>
              <dt>Joined</dt>
              <dd>{formatDate(viewing.user.createdAt)}</dd>
              <dt>Two-factor</dt>
              <dd>{viewing.user.twoFactorEnabled ? 'On' : 'Off'}</dd>
              {viewing.user.role === 'customer' && (
                <>
                  <dt>Pets</dt>
                  <dd>
                    {viewLoading
                      ? 'Loading...'
                      : viewing.pets.length === 0
                        ? 'None'
                        : viewing.pets.map((p) => `${p.name} (${p.type}, ${p.breed})`).join(', ')}
                  </dd>
                </>
              )}
            </dl>
          </div>
        )}
      </Modal>
    </AdminLayout>
  );
}

export default ManageUsers;