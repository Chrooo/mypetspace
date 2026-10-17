import { useEffect, useState } from 'react';
import axios from 'axios';
import { Alert, Button, Form, Input } from 'antd';
import { EditOutlined, UserOutlined } from '@ant-design/icons';
import GroomerLayout from './GroomerLayout';
import { API_URL, ROLE_LABELS, checkAvailable, getUser, saveUser } from '../../auth';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^(\+63|0)9\d{9}$/;
const NAME_RE = /^[A-Za-z\u00C0-\u024F][A-Za-z\u00C0-\u024F .'-]*$/;
const MAX_PHOTO_MB = 5;

const nameRules = (label) => [
  { required: true, whitespace: true, message: `Enter your ${label}` },
  { pattern: NAME_RE, message: 'Letters, spaces, apostrophes, periods and hyphens only' },
  { max: 50, message: 'Maximum of 50 characters' },
];

// same cleaning the server does, so "09..." / "+639..." / upper-case emails compare correctly
const normalizeIdentifier = (value = '') => {
  const v = String(value).trim().toLowerCase();
  if (EMAIL_RE.test(v)) return v;
  return v.replace(/[\s-]/g, '').replace(/^\+63/, '0');
};

const formatJoined = (iso) => {
  const d = new Date(iso);
  if (!iso || Number.isNaN(d.getTime())) return '';
  return `Joined ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
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
        canvas.getContext('2d').drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });

// My Profile: a read-only view, and an edit view (photo, name, email/phone, optional new password)
function GroomerProfile() {
  const [user, setUser] = useState(getUser());
  const [editing, setEditing] = useState(false);
  const [photo, setPhoto] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
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

  const role = (ROLE_LABELS[user.role] || ROLE_LABELS.groomer).label;

  const startEdit = () => {
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
    setEditing(true);
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
    return checkAvailable(_, v);
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
      setEditing(false);
      setNotice(data.message || 'Your profile was updated.');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not reach the server. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  /* ---------- edit view ---------- */
  if (editing) {
    return (
      <GroomerLayout>
        <h1 className="gr-pf-title">EDIT PROFILE</h1>
        <p className="gr-pf-sub">Change your photo and account details.</p>

        <div className="gr-edit">
          <div className="gr-edit-photo">
            <div className="gr-pf-photo">{photo ? <img src={photo} alt="" /> : <UserOutlined />}</div>
            <label className="gr-upload">
              Upload Image
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={onPickPhoto} hidden />
            </label>
            {photo && (
              <button type="button" className="gr-upload" style={{ background: 'none', border: 0 }} onClick={() => setPhoto('')}>
                Remove photo
              </button>
            )}
            {photoError && <div className="gr-photo-error">{photoError}</div>}
          </div>

          <Form
            form={form}
            layout="vertical"
            className="gr-edit-form"
            onFinish={onSave}
            requiredMark={false}
            autoComplete="off"
            validateDebounce={400}
          >
            <Form.Item label="First Name" name="firstName" rules={nameRules('first name')} validateFirst hasFeedback>
              <Input maxLength={50} />
            </Form.Item>
            <Form.Item label="Last Name" name="lastName" rules={nameRules('last name')} validateFirst hasFeedback>
              <Input maxLength={50} />
            </Form.Item>
            <Form.Item label="E-mail or Contact Number" name="identifier" rules={[{ validator: checkIdentifier }]} validateFirst hasFeedback>
              <Input />
            </Form.Item>

            <div className="gr-sect">Change password (optional)</div>
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
                    if (!value || (value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value))) return Promise.resolve();
                    return Promise.reject(new Error('At least 8 characters with a letter and a number'));
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
                  validator: (_, value) =>
                    !getFieldValue('newPassword') || value === getFieldValue('newPassword')
                      ? Promise.resolve()
                      : Promise.reject(new Error('Passwords do not match')),
                }),
              ]}
            >
              <Input.Password autoComplete="new-password" />
            </Form.Item>

            {error && <Alert type="error" showIcon title={error} style={{ marginBottom: 16 }} />}

            <div className="gr-edit-actions">
              <button type="submit" className="gr-pf-btn light" disabled={saving}>
                {saving ? 'Saving...' : 'Save changes'}
              </button>
              <button type="button" className="gr-pf-btn" disabled={saving} onClick={() => setEditing(false)}>
                Cancel
              </button>
            </div>
          </Form>
        </div>
      </GroomerLayout>
    );
  }

  /* ---------- view ---------- */
  return (
    <GroomerLayout>
      <h1 className="gr-pf-title">MY PROFILE</h1>
      <p className="gr-pf-sub">View and manage your account details.</p>

      {notice && <Alert type="success" showIcon closable title={notice} onClose={() => setNotice('')} style={{ maxWidth: 960, marginBottom: 18 }} />}

      <div className="gr-pf-grid">
        <section className="gr-pf-card">
          <div className="gr-pf-sum">
            <div className="gr-pf-photo-col">
              <div className="gr-pf-photo">{user.avatar ? <img src={user.avatar} alt={user.fullName} /> : <UserOutlined />}</div>
              <button type="button" className="gr-pf-btn" onClick={startEdit}>
                Edit <EditOutlined />
              </button>
            </div>
            <div className="gr-pf-text">
              <h2>{user.fullName}</h2>
              <p>{role} - Active</p>
              <p>{user.identifier}</p>
              <p>{formatJoined(user.createdAt)}</p>
            </div>
          </div>
        </section>

        <section className="gr-pf-card gr-pf-info">
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
    </GroomerLayout>
  );
}

export default GroomerProfile;