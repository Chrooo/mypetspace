import { useState } from 'react';
import axios from 'axios';
import { Alert, Button, Form, Input, Tooltip } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import AdminLayout from './AdminLayout';
import { Pills } from './AdminUI';
import { API_URL, checkAvailable } from '../../auth';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^(\+63|0)9\d{9}$/;

const ROLES = [
  { label: 'STAFF', value: 'staff' },
  { label: 'GROOMER', value: 'groomer' },
];

// "Email or phone" accepts either one (same rule as the login page)
const checkIdentifier = (_, value) => {
  const v = (value || '').trim();
  if (!v || EMAIL_RE.test(v) || PHONE_RE.test(v.replace(/[\s-]/g, ''))) return Promise.resolve();
  return Promise.reject(new Error('Enter a valid email or a mobile number like 09123456789'));
};

const nameRules = (label) => [
  { required: true, whitespace: true, message: `Enter the ${label}` },
  { pattern: /^[A-Za-zÀ-ɏ][A-Za-zÀ-ɏ .'-]*$/, message: 'Letters only, please' },
  { max: 50, message: 'Maximum of 50 characters' },
];

// "Confirm password" must match the password field
const matchPassword = ({ getFieldValue }) => ({
  validator: (_, value) =>
    !value || getFieldValue('password') === value ? Promise.resolve() : Promise.reject(new Error('Passwords do not match')),
});

function AdminRegister() {
  const [form] = Form.useForm();
  const [role, setRole] = useState('staff');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null); // { type: 'success' | 'error', text }

  const onFinish = async (values) => {
    setSaving(true);
    setResult(null);
    try {
      const { confirmPassword, ...account } = values;
      const response = await axios.post(`${API_URL}/createStaff`, { ...account, role });
      const created = response.data.user;
      setResult({
        type: 'success',
        text: `${created.fullName} was created as ${role === 'staff' ? 'Hotel Staff' : 'Groomer'}. They log in with "${values.identifier}" and the password you entered.`,
      });
      form.resetFields();
    } catch (err) {
      setResult({ type: 'error', text: err.response?.data?.message || 'Could not reach the server. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="adm-reg">
        <h1>REGISTER</h1>
        <p className="adm-reg-q">For whom are you creating an account?</p>

        <div className="adm-reg-roles">
          <Pills options={ROLES} value={role} onChange={setRole} />
        </div>

        <div className="adm-reg-card">
          <div className="adm-reg-form">
            <p className="adm-reg-note">
              Please fill in the information below. <b>Required fields are marked *</b>
            </p>
            {result && <Alert type={result.type} showIcon title={result.text} style={{ marginBottom: 18 }} />}

            <Form form={form} layout="vertical" requiredMark={false} onFinish={onFinish} validateDebounce={400}>
              <Form.Item name="firstName" rules={nameRules('first name')} hasFeedback>
                <Input placeholder="First Name *" />
              </Form.Item>

              <Form.Item name="lastName" rules={nameRules('last name')} hasFeedback>
                <Input placeholder="Last Name *" />
              </Form.Item>

              <Form.Item
                name="identifier"
                validateFirst
                hasFeedback
                rules={[{ required: true, message: 'Enter an email or phone number' }, { validator: checkIdentifier }, { validator: checkAvailable }]}
              >
                <Input placeholder="Email or Phone *" />
              </Form.Item>

              <Form.Item
                name="password"
                hasFeedback
                rules={[
                  { required: true, message: 'Enter a password' },
                  { min: 8, message: 'Use at least 8 characters' },
                  { pattern: /^(?=.*[A-Za-z])(?=.*\d).+$/, message: 'Include at least one letter and one number' },
                ]}
              >
                <Input.Password placeholder="Password *" autoComplete="new-password" />
              </Form.Item>

              <Form.Item
                name="confirmPassword"
                dependencies={['password']}
                hasFeedback
                rules={[{ required: true, message: 'Confirm the password' }, matchPassword]}
              >
                <Input.Password placeholder="Confirm Password *" autoComplete="new-password" />
              </Form.Item>

              <Button type="primary" htmlType="submit" block loading={saving} className="adm-reg-btn">
                Create
              </Button>
            </Form>
          </div>

          <div className="adm-reg-photo">
            <div className="adm-reg-circle"><span /></div>
            <Tooltip title="Coming soon">
              <Button type="link" disabled icon={<UploadOutlined />} style={{ fontWeight: 800, fontSize: 18 }}>
                Upload Image
              </Button>
            </Tooltip>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

export default AdminRegister;