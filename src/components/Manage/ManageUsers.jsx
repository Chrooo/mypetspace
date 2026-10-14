import { useEffect, useState } from 'react';
import axios from 'axios';
import { Alert, Button, Card, Form, Input, Select, Table, Tag } from 'antd';
import DashboardShell from '../Layout/DashboardShell';
import { API_URL, ROLE_LABELS } from '../../auth';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^(\+63|0)9\d{9}$/;

// "Email or phone" accepts either one (same rule as the login page)
const checkIdentifier = (_, value) => {
  const v = (value || '').trim();
  if (!v || EMAIL_RE.test(v) || PHONE_RE.test(v.replace(/[\s-]/g, ''))) return Promise.resolve();
  return Promise.reject(new Error('Enter a valid email or a mobile number like 09123456789'));
};

// only these two roles can be created here (admins are created from the server .env)
const ROLE_OPTIONS = [
  { value: 'staff', label: 'Hotel Staff' },
  { value: 'groomer', label: 'Groomer' },
];

// random password with letters and numbers (the server needs at least one of each)
const makePassword = () => {
  const letters = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ';
  const digits = '23456789';
  const pick = (set, n) =>
    Array.from(crypto.getRandomValues(new Uint32Array(n)), (x) => set[x % set.length]).join('');
  return pick(letters, 8) + pick(digits, 3);
};

const columns = [
  { title: 'Name', dataIndex: 'fullName' },
  { title: 'Email or phone', dataIndex: 'identifier' },
  {
    title: 'Role',
    dataIndex: 'role',
    render: (role) => <Tag color={ROLE_LABELS[role]?.color}>{ROLE_LABELS[role]?.label || role}</Tag>,
    filters: Object.entries(ROLE_LABELS).map(([value, info]) => ({ text: info.label, value })),
    onFilter: (value, record) => record.role === value,
  },
  {
    title: 'Created',
    dataIndex: 'createdAt',
    render: (date) => (date ? new Date(date).toLocaleDateString() : ''),
  },
];

function ManageUsers() {
  const [form] = Form.useForm();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null); // { type: 'success' | 'error', text }

  // load everyone when the page opens
  useEffect(() => {
    axios
      .get(`${API_URL}/users`)
      .then((response) => setUsers(response.data.users))
      .catch((err) => setLoadError(err.response?.data?.message || 'Could not load the users.'))
      .finally(() => setLoading(false));
  }, []);

  const onFinish = async (values) => {
    setSaving(true);
    setResult(null);
    try {
      const response = await axios.post(`${API_URL}/createStaff`, values);
      const created = response.data.user;
      setUsers((current) => [created, ...current]);
      setResult({
        type: 'success',
        text: `${created.fullName} was created as ${ROLE_LABELS[created.role].label}. Give them the login "${values.identifier}" and the password you entered.`,
      });
      form.resetFields(['fullName', 'identifier', 'password']);
    } catch (err) {
      setResult({
        type: 'error',
        text: err.response?.data?.message || 'Could not reach the server. Please try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardShell
      title="Users and Roles"
      subtitle="Create staff and groomer accounts, and see everyone who has an account."
      back
    >
      <Card title="Create a staff or groomer account" style={{ maxWidth: 520, marginBottom: 28 }}>
        {result && <Alert type={result.type} showIcon title={result.text} style={{ marginBottom: 16 }} />}

        <Form form={form} layout="vertical" initialValues={{ role: 'staff' }} onFinish={onFinish} requiredMark={false}>
          <Form.Item label="Full name" name="fullName" rules={[{ required: true, message: 'Enter the full name' }]}>
            <Input placeholder="Full name" />
          </Form.Item>

          <Form.Item
            label="Email or phone (this is their login)"
            name="identifier"
            rules={[{ required: true, message: 'Enter an email or phone number' }, { validator: checkIdentifier }]}
          >
            <Input placeholder="Email or phone" />
          </Form.Item>

          <Form.Item
            label="Temporary password"
            name="password"
            extra={
              <Button type="link" style={{ padding: 0 }} onClick={() => form.setFieldsValue({ password: makePassword() })}>
                Generate a password
              </Button>
            }
            rules={[
              { required: true, message: 'Enter a password' },
              { min: 8, message: 'Use at least 8 characters' },
              { pattern: /^(?=.*[A-Za-z])(?=.*\d).+$/, message: 'Include at least one letter and one number' },
            ]}
          >
            <Input.Password placeholder="Password" />
          </Form.Item>

          <Form.Item label="Role" name="role" rules={[{ required: true }]}>
            <Select options={ROLE_OPTIONS} />
          </Form.Item>

          <Button type="primary" htmlType="submit" loading={saving}>
            Create account
          </Button>
        </Form>
      </Card>

      <Card title="All users">
        {loadError && <Alert type="error" showIcon title={loadError} style={{ marginBottom: 16 }} />}
        <Table
          rowKey="_id"
          columns={columns}
          dataSource={users}
          loading={loading}
          pagination={{ pageSize: 8, hideOnSinglePage: true }}
          scroll={{ x: true }}
        />
      </Card>
    </DashboardShell>
  );
}

export default ManageUsers;