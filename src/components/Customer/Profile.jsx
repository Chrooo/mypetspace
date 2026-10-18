import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Alert, Form, Input, Modal } from 'antd';
import { ArrowLeftOutlined, EditOutlined, UploadOutlined } from '@ant-design/icons';
import { API_URL, getUser, saveUser } from '../../auth';
import logo from '../../assets/logo.png';
import { AvatarImage, HeaderAvatar } from './Avatar';
import './CustomerDashboard.css'; // top bar styles are shared with the dashboard
import './Profile.css';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^(\+63|0)9\d{9}$/;
const NAME_RE = /^[A-Za-zÀ-ɏ][A-Za-zÀ-ɏ .'-]*$/;
const USERNAME_RE = /^[a-z0-9._]{3,20}$/;
const MAX_PHOTO_MB = 5;

// same cleaning the server does, so "09..." / "+639..." / upper-case emails compare correctly
const cleanEmail = (value = '') => String(value).trim().toLowerCase();
const cleanPhone = (value = '') => String(value).trim().replace(/[\s-]/g, '').replace(/^\+63/, '0');

const nameRules = (label) => [
  { required: true, whitespace: true, message: `Enter your ${label}` },
  { pattern: NAME_RE, message: 'Letters, spaces, apostrophes, periods and hyphens only' },
  { max: 50, message: 'Maximum of 50 characters' },
];

// what each box shows for a user (the login email/phone is always filled in)
const valuesFrom = (u) => {
  const loginIsEmail = EMAIL_RE.test(u.identifier || '');
  return {
    username: u.username || '',
    firstName: u.firstName || '',
    lastName: u.lastName || '',
    email: u.email || (loginIsEmail ? u.identifier : ''),
    contactNumber: u.contactNumber || (loginIsEmail ? '' : u.identifier || ''),
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  };
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

// a box that is locked until its pencil is clicked (works inside Form.Item)
function EditableInput({ resetKey, ...props }) {
  const ref = useRef(null);
  const [editing, setEditing] = useState(false);
  useEffect(() => setEditing(false), [resetKey]); // lock again after saving

  const startEditing = () => {
    setEditing(true);
    setTimeout(() => ref.current?.focus(), 0);
  };

  return (
    <Input
      {...props}
      ref={ref}
      readOnly={!editing}
      className={`pf-input${editing ? ' is-editing' : ''}`}
      suffix={
        <button type="button" className="pf-pencil" onClick={startEditing} aria-label="Edit this field">
          <EditOutlined />
        </button>
      }
    />
  );
}

function Profile() {
  const [user, setUser] = useState(getUser());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(null); // { type, text }
  const [photo, setPhoto] = useState(user.avatar || ''); // the photo shown (saved when you press Save changes)
  const [photoError, setPhotoError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saveCount, setSaveCount] = useState(0);
  const [pending, setPending] = useState(null); // { values, changes } waiting for "Yes, save"
  const [form] = Form.useForm();

  const loginIsEmail = EMAIL_RE.test(user.identifier || '');
  const emailValue = Form.useWatch('email', form);
  const phoneValue = Form.useWatch('contactNumber', form);
  const newPasswordValue = Form.useWatch('newPassword', form);

  // the current password is needed only to change the email/phone you log in with, or the password
  const changingLogin = loginIsEmail
    ? emailValue !== undefined && cleanEmail(emailValue) !== user.identifier
    : phoneValue !== undefined && cleanPhone(phoneValue) !== user.identifier;
  const needsPassword = changingLogin || !!newPasswordValue;

  // always show what is really in the database (and refresh the saved copy)
  useEffect(() => {
    axios
      .get(`${API_URL}/me`)
      .then(({ data }) => {
        setUser(data.user);
        saveUser(data.user);
        if (!form.isFieldsTouched()) {
          form.setFieldsValue(valuesFrom(data.user));
          setPhoto(data.user.avatar || '');
        }
      })
      .catch(() => {}); // fall back to the saved copy
  }, [form]);

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

  const alreadyRegistered = async (value) => {
    try {
      const { data } = await axios.get(`${API_URL}/check-identifier`, { params: { identifier: value } });
      return !data.available;
    } catch (err) {
      return false; // the server checks again when saving
    }
  };

  const checkUsername = async (_, value) => {
    const v = (value || '').trim().toLowerCase();
    if (!v) return Promise.resolve();
    if (!USERNAME_RE.test(v)) {
      return Promise.reject(new Error('3 to 20 characters: letters, numbers, periods and underscores'));
    }
    if (v === (user.username || '')) return Promise.resolve();
    try {
      const { data } = await axios.get(`${API_URL}/check-username`, { params: { username: v } });
      if (!data.available) return Promise.reject(new Error('This username is already taken'));
    } catch (err) {
      /* the server checks again when saving */
    }
    return Promise.resolve();
  };

  const checkEmail = async (_, value) => {
    const v = cleanEmail(value);
    if (!v) {
      return loginIsEmail ? Promise.reject(new Error('Your email is how you log in, so it cannot be empty')) : Promise.resolve();
    }
    if (!EMAIL_RE.test(v)) return Promise.reject(new Error('Enter a valid email address'));
    if (v === cleanEmail(user.email) || v === user.identifier) return Promise.resolve(); // your own is fine
    if (await alreadyRegistered(v)) return Promise.reject(new Error('This email is already registered'));
    return Promise.resolve();
  };

  const checkPhone = async (_, value) => {
    const v = cleanPhone(value);
    if (!v) {
      return loginIsEmail ? Promise.resolve() : Promise.reject(new Error('Your mobile number is how you log in, so it cannot be empty'));
    }
    if (!PHONE_RE.test(v)) return Promise.reject(new Error('Enter a mobile number like 09123456789'));
    if (v === cleanPhone(user.contactNumber) || v === user.identifier) return Promise.resolve(); // your own is fine
    if (await alreadyRegistered(v)) return Promise.reject(new Error('This mobile number is already registered'));
    return Promise.resolve();
  };

  // step 1: the form is valid -> list what changed and ask "are you sure?"
  const askToSave = (values) => {
    const base = valuesFrom(user);
    const changes = [];
    if (photo !== (user.avatar || '')) changes.push(photo ? 'Profile photo' : 'Profile photo (removed)');
    if ((values.username || '').trim().toLowerCase() !== base.username) changes.push('Username');
    if (values.firstName.trim() !== base.firstName) changes.push('First name');
    if (values.lastName.trim() !== base.lastName) changes.push('Last name');
    if (cleanEmail(values.email) !== cleanEmail(base.email)) changes.push('E-mail');
    if (cleanPhone(values.contactNumber) !== cleanPhone(base.contactNumber)) changes.push('Contact number');
    if (values.newPassword) changes.push('Password');

    if (changes.length === 0) {
      setNotice({ type: 'info', text: 'No changes to save.' });
      return;
    }
    setError('');
    setPending({ values, changes });
  };

  // step 2: the customer pressed "Yes, save changes"
  const onSave = async (values) => {
    setError('');
    const payload = {
      username: (values.username || '').trim(),
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      email: (values.email || '').trim(),
      contactNumber: (values.contactNumber || '').trim(),
      avatar: photo,
    };
    if (values.newPassword) payload.newPassword = values.newPassword;
    if (needsPassword && values.currentPassword) payload.currentPassword = values.currentPassword;

    setSaving(true);
    try {
      const { data } = await axios.put(`${API_URL}/me`, payload);
      setUser(data.user);
      saveUser(data.user); // the photo at the top right of every page updates right away
      setPhoto(data.user.avatar || '');
      form.setFieldsValue(valuesFrom(data.user));
      setShowPassword(false);
      setSaveCount((n) => n + 1);
      const same = data.message === 'No changes to save.';
      setNotice({ type: same ? 'info' : 'success', text: data.message || 'Your profile was updated.' });
    } catch (err) {
      setError(err.response?.data?.message || 'Could not reach the server. Please try again.');
    } finally {
      setSaving(false);
      setPending(null); // closes the confirm window (an error shows in the form)
    }
  };

  const formProps = {
    colon: false,
    labelAlign: 'right',
    labelCol: { flex: '220px' },
    wrapperCol: { flex: 'auto' },
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
        <HeaderAvatar user={user} to={null} />
      </header>

      <main className="pf-main">
        {notice && (
          <Alert type={notice.type} showIcon closable message={notice.text} onClose={() => setNotice(null)} className="pf-notice" />
        )}

        <div className="pf-layout">
          <aside className="pf-side">
            <div className="pf-photo">
              <AvatarImage src={photo} alt="Your profile photo" />
            </div>

            <label className="pf-upload-link">
              Upload Image <UploadOutlined />
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={onPickPhoto} hidden />
            </label>
            {photo && (
              <button type="button" className="pf-upload-remove" onClick={() => setPhoto('')}>
                Remove photo
              </button>
            )}
            {photoError && <div className="pf-upload-error">{photoError}</div>}
            {photo !== (user.avatar || '') && !photoError && (
              <div className="pf-upload-hint">Press Save changes to use this photo.</div>
            )}

            <button type="button" className="pf-save-btn" onClick={() => form.submit()} disabled={saving}>
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </aside>

          <Form
            form={form}
            className="pf-form"
            initialValues={valuesFrom(user)}
            onFinish={askToSave}
            scrollToFirstError
            requiredMark={false}
            autoComplete="off"
            {...formProps}
          >
            <button type="submit" hidden aria-hidden="true" tabIndex={-1} /> {/* lets Enter save */}

            <Form.Item label="Username:" name="username" validateTrigger="onBlur" validateFirst rules={[{ validator: checkUsername }]}>
              <EditableInput resetKey={saveCount} maxLength={20} />
            </Form.Item>

            <Form.Item label="First Name:" name="firstName" validateFirst rules={nameRules('first name')}>
              <EditableInput resetKey={saveCount} maxLength={50} />
            </Form.Item>

            <Form.Item label="Last Name:" name="lastName" validateFirst rules={nameRules('last name')}>
              <EditableInput resetKey={saveCount} maxLength={50} />
            </Form.Item>

            <Form.Item label="E-mail:" name="email" validateTrigger="onBlur" validateFirst rules={[{ validator: checkEmail }]}>
              <EditableInput resetKey={saveCount} />
            </Form.Item>

            <Form.Item label="Contact Number:" name="contactNumber" validateTrigger="onBlur" validateFirst rules={[{ validator: checkPhone }]}>
              <EditableInput resetKey={saveCount} />
            </Form.Item>

            {needsPassword && (
              <Form.Item
                label="Current Password:"
                name="currentPassword"
                extra="Needed because you are changing your login or password."
                rules={[{ required: true, message: 'Enter your current password to confirm this change' }]}
              >
                <Input.Password className="pf-input is-editing" autoComplete="current-password" />
              </Form.Item>
            )}

            <div className="pf-pw-toggle">
              <button
                type="button"
                className="pf-link"
                onClick={() => {
                  if (showPassword) form.setFieldsValue({ newPassword: '', confirmPassword: '' });
                  setShowPassword((open) => !open);
                }}
              >
                {showPassword ? 'Cancel password change' : 'Change password'}
              </button>
            </div>

            {showPassword && (
              <>
                <Form.Item
                  label="New Password:"
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
                  <Input.Password className="pf-input is-editing" autoComplete="new-password" />
                </Form.Item>

                <Form.Item
                  label="Confirm Password:"
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
                  <Input.Password className="pf-input is-editing" autoComplete="new-password" />
                </Form.Item>
              </>
            )}

            {error && <Alert type="error" showIcon message={error} className="pf-error" />}
          </Form>
        </div>
      </main>

      <Modal
        open={!!pending}
        onCancel={() => !saving && setPending(null)}
        closable={false}
        maskClosable={false}
        keyboard={!saving}
        centered
        width={460}
        destroyOnHidden
        className="pf-modal"
        title="Save your changes?"
        footer={
          <div className="pf-modal-actions">
            <button type="button" className="pf-modal-no" onClick={() => setPending(null)} disabled={saving}>
              Cancel changes
            </button>
            <button type="button" className="pf-modal-yes" onClick={() => onSave(pending.values)} disabled={saving}>
              {saving ? 'Saving...' : 'Yes, save changes'}
            </button>
          </div>
        }
      >
        <p className="pf-modal-text">Are you sure you want to save these changes to your profile?</p>
        <ul className="pf-modal-list">
          {(pending?.changes || []).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Modal>
    </div>
  );
}

export default Profile;