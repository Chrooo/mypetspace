import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Alert, Button, Form, Input, Modal } from 'antd';
import { ArrowLeftOutlined, EditOutlined, UserOutlined } from '@ant-design/icons';
import { API_URL, ROLE_LABELS, getUser, saveUser } from '../../auth';
import logo from '../../assets/logo.png';
import './CustomerDashboard.css'; // top bar styles are shared with the dashboard
import './Profile.css';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^(\+63|0)9\d{9}$/;
const NAME_RE = /^[A-Za-z\u00C0-\u024F][A-Za-z\u00C0-\u024F .'-]*$/;
const MAX_PHOTO_MB = 5;

// same cleaning the server does, so "09..." / "+639..." / upper-case emails compare correctly
const normalizeIdentifier = (value = '') => {
  const v = String(value).trim().toLowerCase();
  if (EMAIL_RE.test(v)) return v;
  return v.replace(/[\s-]/g, '').replace(/^\+63/, '0');
};

const nameRules = (label) => [
  { required: true, whitespace: true, message: `Enter your ${label}` },
  { pattern: NAME_RE, message: 'Letters, spaces, apostrophes, periods and hyphens only' },
  { max: 50, message: 'Maximum of 50 characters' },
];

const formatJoined = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const month = d.getMonth() === 8 ? 'Sept' : d.toLocaleDateString('en-US', { month: 'short' });
  return `Joined ${month} ${d.getDate()}, ${d.getFullYear()}`;
};

// shrink the chosen photo to a 256x256 JPEG so it is small enough to save
const resizePhoto = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('That file is not a valid image.'));
      img.onload = () => {
        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const side = Math.min(img.width, img.height); // center-crop to a square
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        canvas.getContext('2d').drawImage(img, sx, sy, side, side, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });

function Profile() {
  const [user, setUser] = useState(getUser());
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [photo, setPhoto] = useState(''); // photo shown in the edit form
  const [photoError, setPhotoError] = useState('');
  const [form] = Form.useForm();

  // always show what is really in the database (and refresh the saved copy)
  useEffect(() => {
    axios
      .get(`${API_URL}/me`)
      .then(({ data }) => {
        setUser(data.user);
        saveUser(data.user);
      })
      .catch(() => {}); // fall back to the saved copy
  }, []);

  const role = (ROLE_LABELS[user.role] || ROLE_LABELS.customer).label;

  const openEdit = () => {
    form.setFieldsValue({
      firstName: user.firstName,
      lastName: user.lastName,
      identifier: user.identifier,
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setPhoto(user.avatar || '');
    setPhotoError('');
    setError('');
    setNotice('');
    setOpen(true);
  };

  const closeEdit = () => {
    if (!saving) setOpen(false);
  };

  const onPickPhoto = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // lets the same file be picked again
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setPhotoError('Please choose a PNG, JPG or WEBP image.');
      return;
    }
    if (file.size > MAX_PHOTO_MB * 1024 * 1024) {
      setPhotoError(`The photo must be under ${MAX_PHOTO_MB} MB.`);
      return;
    }
    try {
      setPhoto(await resizePhoto(file));
      setPhotoError('');
    } catch (err) {
      setPhotoError(err.message);
    }
  };

  // email/phone: right format, and not used by somebody else (your own is fine)
  const checkIdentifier = async (_, value) => {
    const v = (value || '').trim();
    if (!v) return Promise.reject(new Error('Enter your email or mobile number'));
    if (!EMAIL_RE.test(v) && !PHONE_RE.test(v.replace(/[\s-]/g, ''))) {
      return Promise.reject(new Error('Enter a valid email or a mobile number like 09123456789'));
    }
    if (normalizeIdentifier(v) === user.identifier) return Promise.resolve();
    try {
      const { data } = await axios.get(`${API_URL}/check-identifier`, { params: { identifier: v } });
      if (!data.available) return Promise.reject(new Error('This email or phone is already registered'));
    } catch (err) {
      /* the server checks again when saving */
    }
    return Promise.resolve();
  };

  const onSave = async (values) => {
    setError('');
    const payload = {
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      identifier: values.identifier.trim(),
      avatar: photo,
    };
    if (values.newPassword) payload.newPassword = values.newPassword;
    if (values.currentPassword) payload.currentPassword = values.currentPassword;

    setSaving(true);
    try {
      const { data } = await axios.put(`${API_URL}/me`, payload);
      setUser(data.user);
      saveUser(data.user);
      setOpen(false);
      setNotice(data.message || 'Your profile was updated.');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not reach the server. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="cd">
      <header className="cd-top">
        <Link to="/" aria-label="My Pet Space home">
          <img src={logo} alt="My Pet Space" className="cd-logo" />
        </Link>
        <span className="cd-top-title">User Dashboard</span>
        <Link to="/account" className="pf-back" aria-label="Back to dashboard">
          <ArrowLeftOutlined />
        </Link>
        <span className="cd-avatar">
          {user.avatar ? (
            <img src={user.avatar} alt="" className="cd-avatar-img" />
          ) : (
            <>
              <span className="cd-avatar-sky" />
              <span className="cd-avatar-hill" />
            </>
          )}
        </span>
      </header>

      <main className="pf-main">
        <h1 className="pf-title">MY PROFILE</h1>
        <p className="pf-sub">View and manage your account details.</p>

        {notice && <Alert type="success" showIcon closable message={notice} onClose={() => setNotice('')} className="pf-notice" />}

        <div className="pf-grid">
          <section className="pf-card pf-summary">
            <div className="pf-summary-row">
              <div className="pf-photo-col">
                <div className="pf-photo">
                  {user.avatar ? <img src={user.avatar} alt={user.fullName} /> : <UserOutlined />}
                </div>
                <button type="button" className="pf-edit" onClick={openEdit}>
                  Edit <EditOutlined />
                </button>
              </div>
              <div className="pf-summary-text">
                <h2>{user.fullName}</h2>
                <p>{role}</p>
                <p>{user.identifier}</p>
                <p>{formatJoined(user.createdAt)}</p>
              </div>
            </div>
          </section>

          <section className="pf-card pf-info">
            <h2>Account Information</h2>
            <dl>
              <dt>Full Name</dt>
              <dd>{user.fullName}</dd>
              <dt>Email/Phone</dt>
              <dd>{user.identifier}</dd>
              <dt>Role</dt>
              <dd>{role}</dd>
              <dt>Status</dt>
              <dd>Active</dd>
            </dl>
          </section>
        </div>
      </main>

      <Modal
        title="Edit Profile"
        open={open}
        onCancel={closeEdit}
        maskClosable={false}
        destroyOnHidden
        footer={null}
        width={520}
      >
        <Form form={form} layout="vertical" onFinish={onSave} requiredMark={false} autoComplete="off">
          <div className="pf-upload">
            <div className="pf-photo pf-photo-sm">
              {photo ? <img src={photo} alt="" /> : <UserOutlined />}
            </div>
            <div>
              <label className="pf-upload-btn">
                Change photo
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={onPickPhoto} hidden />
              </label>
              {photo && (
                <button type="button" className="pf-upload-remove" onClick={() => setPhoto('')}>
                  Remove
                </button>
              )}
              <div className="pf-upload-hint">PNG, JPG or WEBP, up to {MAX_PHOTO_MB} MB.</div>
              {photoError && <div className="pf-upload-error">{photoError}</div>}
            </div>
          </div>

          <div className="pf-two">
            <Form.Item label="First name" name="firstName" rules={nameRules('first name')}>
              <Input maxLength={50} />
            </Form.Item>
            <Form.Item label="Last name" name="lastName" rules={nameRules('last name')}>
              <Input maxLength={50} />
            </Form.Item>
          </div>

          <Form.Item
            label="Email or phone"
            name="identifier"
            validateTrigger="onBlur"
            rules={[{ validator: checkIdentifier }]}
          >
            <Input />
          </Form.Item>

          <div className="pf-section-title">Change password (optional)</div>

          <Form.Item
            label="Current password"
            name="currentPassword"
            dependencies={['identifier', 'newPassword']}
            extra="Needed only if you change your email/phone or password."
            rules={[
              ({ getFieldValue }) => ({
                validator: (_, value) => {
                  const changingId = normalizeIdentifier(getFieldValue('identifier')) !== user.identifier;
                  const changingPw = !!getFieldValue('newPassword');
                  if ((changingId || changingPw) && !value) {
                    return Promise.reject(new Error('Enter your current password to confirm this change'));
                  }
                  return Promise.resolve();
                },
              }),
            ]}
          >
            <Input.Password autoComplete="current-password" />
          </Form.Item>

          <Form.Item
            label="New password"
            name="newPassword"
            rules={[
              {
                validator: (_, value) => {
                  if (!value) return Promise.resolve();
                  if (value.length < 8 || !/[A-Za-z]/.test(value) || !/\d/.test(value)) {
                    return Promise.reject(new Error('At least 8 characters with a letter and a number'));
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>

          <Form.Item
            label="Confirm new password"
            name="confirmPassword"
            dependencies={['newPassword']}
            rules={[
              ({ getFieldValue }) => ({
                validator: (_, value) => {
                  if (!getFieldValue('newPassword') || value === getFieldValue('newPassword')) return Promise.resolve();
                  return Promise.reject(new Error('Passwords do not match'));
                },
              }),
            ]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>

          {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}

          <div className="pf-actions">
            <Button onClick={closeEdit} disabled={saving}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={saving} className="pf-save">Save changes</Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}

export default Profile;