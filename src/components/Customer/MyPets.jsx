import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Alert, Button, Form, Input, Modal, Select, Spin } from 'antd';
import {
  ArrowLeftOutlined,
  CheckCircleFilled,
  CloseOutlined,
  DeleteOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { API_URL, useUser } from '../../auth';
import logo from '../../assets/logo.png';
import { HeaderAvatar } from './Avatar';
import './CustomerDashboard.css'; // top bar styles are shared with the dashboard
import './MyPets.css';

const MAX_PHOTO_MB = 5;

/* ---------- validation (same rules as the sign-up page) ---------- */
const petNameRules = [
  { required: true, whitespace: true, message: "Enter your pet's name" },
  { pattern: /^[A-Za-z0-9\u00C0-\u024F][A-Za-z0-9\u00C0-\u024F .'-]*$/, message: 'Letters and numbers only, please' },
  { max: 50, message: 'Maximum of 50 characters' },
];

const breedRules = [
  { required: true, whitespace: true, message: 'Enter the breed' },
  { pattern: /^[A-Za-z\u00C0-\u024F][A-Za-z\u00C0-\u024F .'/()-]*$/, message: 'Letters only, please' },
  { max: 50, message: 'Maximum of 50 characters' },
];

// age in years: 0 to 40 (decimals such as 0.5 are fine for puppies and kittens)
const checkAge = (_, value) => {
  const v = String(value ?? '').trim();
  if (!v) return Promise.reject(new Error('Enter the age'));
  if (!/^\d+(\.\d+)?$/.test(v) || Number(v) > 40) return Promise.reject(new Error('Enter an age from 0 to 40'));
  return Promise.resolve();
};

// weight in kg: 0.1 to 100 (grooming prices depend on it)
const checkWeight = (_, value) => {
  const v = String(value ?? '').trim();
  if (!v) return Promise.reject(new Error('Enter the weight'));
  if (!/^\d+(\.\d+)?$/.test(v) || Number(v) < 0.1 || Number(v) > 100) return Promise.reject(new Error('Enter a weight from 0.1 to 100 kg'));
  return Promise.resolve();
};

const ageText = (age) => `${age} ${Number(age) === 1 ? 'year' : 'years'} old`;

// shrink the chosen photo to a 360x360 JPEG so it is small enough to save
const resizePhoto = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('That file is not a valid image.'));
      img.onload = () => {
        const size = 360;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const side = Math.min(img.width, img.height); // center-crop to a square
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        canvas.getContext('2d').drawImage(img, sx, sy, side, side, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });

const PawIcon = () => (
  <svg viewBox="0 0 64 64" fill="currentColor" aria-hidden="true">
    <ellipse cx="13" cy="30" rx="6" ry="8" transform="rotate(-20 13 30)" />
    <ellipse cx="25" cy="16" rx="6.5" ry="9" transform="rotate(-8 25 16)" />
    <ellipse cx="41" cy="16" rx="6.5" ry="9" transform="rotate(8 41 16)" />
    <ellipse cx="53" cy="30" rx="6" ry="8" transform="rotate(20 53 30)" />
    <path d="M32 29c-9 0-18 10-18 19 0 7 6 10 11 9 3-1 5-2 7-2s4 1 7 2c5 1 11-2 11-9 0-9-9-19-18-19z" />
  </svg>
);

function MyPets() {
  const user = useUser();
  const [pets, setPets] = useState(null); // null = still loading
  const [loadError, setLoadError] = useState('');
  const [notice, setNotice] = useState('');

  // "Edit" button = choose pets to delete
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState([]); // ids
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // add / edit window
  const [modal, setModal] = useState(null); // null | { pet } (pet = null means "add")
  const [photo, setPhoto] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [form] = Form.useForm();

  const loadPets = () =>
    axios
      .get(`${API_URL}/pets`)
      .then(({ data }) => {
        setPets(data.pets);
        setLoadError('');
      })
      .catch((err) => {
        setPets((old) => old || []);
        setLoadError(err.response?.data?.message || 'Could not load your pets. Please try again.');
      });

  useEffect(() => {
    loadPets();
  }, []);

  const list = pets || [];
  const allSelected = list.length > 0 && selected.length === list.length;

  /* ---------- select / delete ---------- */
  const startSelecting = () => {
    setSelecting(true);
    setSelected([]);
    setNotice('');
  };
  const stopSelecting = () => {
    setSelecting(false);
    setSelected([]);
  };
  const toggleOne = (id) =>
    setSelected((old) => (old.includes(id) ? old.filter((x) => x !== id) : [...old, id]));
  const toggleAll = () => setSelected(allSelected ? [] : list.map((p) => p._id));

  const confirmDelete = async () => {
    setDeleting(true);
    setDeleteError('');
    try {
      const { data } = await axios.post(`${API_URL}/pets/delete`, { ids: selected });
      setConfirmOpen(false);
      setNotice(`${data.deleted} ${data.deleted === 1 ? 'pet was' : 'pets were'} deleted.`);
      stopSelecting();
      await loadPets();
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Could not reach the server. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  /* ---------- add / edit ---------- */
  const openModal = (pet) => {
    form.resetFields();
    if (pet) {
      form.setFieldsValue({
        name: pet.name,
        breed: pet.breed,
        age: String(pet.age),
        weight: pet.weight ? String(pet.weight) : '',
        gender: pet.gender,
        type: pet.type,
        notes: pet.notes || '',
      });
    }
    setPhoto(pet?.photo || '');
    setPhotoError('');
    setFormError('');
    setNotice('');
    setModal({ pet });
  };

  const closeModal = () => {
    if (!saving) setModal(null);
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

  const onSave = async (values) => {
    const editing = modal?.pet;
    const payload = {
      name: values.name.trim(),
      breed: values.breed.trim(),
      age: values.age,
      weight: values.weight,
      gender: values.gender,
      type: values.type,
      notes: (values.notes || '').trim(),
      photo,
    };

    setSaving(true);
    setFormError('');
    try {
      if (editing) await axios.put(`${API_URL}/pets/${editing._id}`, payload);
      else await axios.post(`${API_URL}/pets`, payload);
      setModal(null);
      setNotice(editing ? 'Your pet was updated.' : 'Your pet was added.');
      await loadPets();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Could not reach the server. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const editing = modal?.pet;

  return (
    <div className="cd">
      <header className="cd-top">
        <Link to="/" aria-label="My Pet Space home">
          <img src={logo} alt="My Pet Space" className="cd-logo" />
        </Link>
        <span className="cd-top-title">User Dashboard</span>
        <Link to="/account" className="mp-back" aria-label="Back to dashboard">
          <ArrowLeftOutlined />
        </Link>
        <HeaderAvatar user={user} />
      </header>

      <main className="mp-main">
        <div className="mp-head">
          <div>
            <h1 className="mp-title">MY PETS</h1>
            <p className="mp-sub">Your furbabies in one place.</p>
          </div>
          <div className="mp-actions">
            {selecting ? (
              <button type="button" className="mp-btn mp-btn-light" onClick={stopSelecting}>Cancel</button>
            ) : (
              <button type="button" className="mp-btn" onClick={startSelecting} disabled={list.length === 0}>Edit</button>
            )}
            <button type="button" className="mp-btn" onClick={() => openModal(null)}>Add a Pet</button>
          </div>
        </div>

        {notice && <Alert type="success" showIcon closable title={notice} onClose={() => setNotice('')} className="mp-notice" />}
        {loadError && <Alert type="error" showIcon title={loadError} className="mp-notice" />}

        {selecting && list.length > 0 && (
          <div className="mp-selectbar">
            <button type="button" className={`mp-all${allSelected ? ' is-on' : ''}`} onClick={toggleAll} aria-label="Select all">
              <CheckCircleFilled />
              <span>All</span>
            </button>
            <strong>{selected.length} selected</strong>
          </div>
        )}

        {pets === null ? (
          <div className="mp-loading"><Spin /></div>
        ) : list.length === 0 ? (
          <div className="mp-empty">You have no pets registered yet. Tap <b>Add a Pet</b> to register one.</div>
        ) : (
          <div className="mp-grid">
            {list.map((pet) => {
              const isOn = selected.includes(pet._id);
              return (
                <article
                  key={pet._id}
                  className={`mp-card${selecting ? ' is-selectable' : ''}${isOn ? ' is-selected' : ''}`}
                  onClick={selecting ? () => toggleOne(pet._id) : undefined}
                  role={selecting ? 'checkbox' : undefined}
                  aria-checked={selecting ? isOn : undefined}
                  tabIndex={selecting ? 0 : undefined}
                  onKeyDown={selecting ? (e) => (e.key === ' ' || e.key === 'Enter') && (e.preventDefault(), toggleOne(pet._id)) : undefined}
                >
                  <div className="mp-photo">
                    {pet.photo ? <img src={pet.photo} alt={pet.name} /> : <PawIcon />}
                  </div>
                  <div className="mp-info">
                    <h2>{pet.name}</h2>
                    <p>{pet.type} - {pet.gender}</p>
                    <p>{pet.breed}</p>
                    <p>{ageText(pet.age)}{pet.weight ? ` - ${pet.weight} kg` : ''}</p>
                  </div>
                  {selecting ? (
                    <CheckCircleFilled className={`mp-tick${isOn ? ' is-on' : ''}`} />
                  ) : (
                    <button
                      type="button"
                      className="mp-card-edit"
                      onClick={() => openModal(pet)}
                      aria-label={`Edit ${pet.name}`}
                    >
                      <EditOutlined />
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {selecting && list.length > 0 && (
          <div className="mp-deleterow">
            <button
              type="button"
              className="mp-delete"
              disabled={selected.length === 0}
              onClick={() => { setDeleteError(''); setConfirmOpen(true); }}
            >
              <DeleteOutlined /> {allSelected ? 'Delete all' : `Delete (${selected.length})`}
            </button>
          </div>
        )}
      </main>

      {/* ---------- Add a Pet / Edit Pet ---------- */}
      <Modal
        open={!!modal}
        onCancel={closeModal}
        footer={null}
        destroyOnHidden
        maskClosable={false}
        width={640}
        centered
        className="mp-modal"
        closeIcon={<span className="mp-close"><CloseOutlined /></span>}
        title={<span className="mp-modal-title">{editing ? 'Edit Pet' : 'Add a Pet'}</span>}
      >
        <div className="mp-modal-body">
          <div className="mp-modal-photo">
            <div className="mp-bigphoto">
              {photo ? <img src={photo} alt="" /> : <PawIcon />}
            </div>
            <label className="mp-photo-btn">
              {photo ? 'Edit' : 'Add photo'} <EditOutlined />
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={onPickPhoto} hidden />
            </label>
            {photo && (
              <button type="button" className="mp-photo-remove" onClick={() => setPhoto('')}>Remove photo</button>
            )}
            {photoError && <div className="mp-photo-error">{photoError}</div>}
          </div>

          <Form form={form} layout="vertical" requiredMark={false} onFinish={onSave} autoComplete="off" className="mp-form" size="large">
            {formError && <Alert type="error" showIcon title={formError} style={{ marginBottom: 12 }} />}

            <Form.Item name="name" rules={petNameRules}>
              <Input className="mp-input" prefix={<span className="mp-prefix">Pet Name:</span>} maxLength={50} />
            </Form.Item>

            <div className="mp-row">
              <Form.Item name="breed" rules={breedRules}>
                <Input className="mp-input" prefix={<span className="mp-prefix">Breed:</span>} maxLength={50} />
              </Form.Item>
              <Form.Item name="age" rules={[{ validator: checkAge }]}>
                <Input className="mp-input" prefix={<span className="mp-prefix">Age:</span>} inputMode="decimal" maxLength={5} />
              </Form.Item>
            </div>

            <div className="mp-row">
              <Form.Item name="weight" rules={[{ validator: checkWeight }]}>
                <Input className="mp-input" prefix={<span className="mp-prefix">Weight (kg):</span>} inputMode="decimal" maxLength={5} />
              </Form.Item>
            </div>

            <div className="mp-row">
              <Form.Item name="gender" rules={[{ required: true, message: 'Choose a gender' }]}>
                <Select
                  className="mp-select"
                  placeholder="Gender"
                  options={[{ value: 'Male', label: 'Male' }, { value: 'Female', label: 'Female' }]}
                />
              </Form.Item>
              <Form.Item name="type" rules={[{ required: true, message: 'Choose a type' }]}>
                <Select
                  className="mp-select"
                  placeholder="Type"
                  options={[{ value: 'Dog', label: 'Dog' }, { value: 'Cat', label: 'Cat' }]}
                />
              </Form.Item>
            </div>

            <Form.Item name="notes" rules={[{ max: 300, message: 'Maximum of 300 characters' }]}>
              <Input className="mp-input" placeholder="Additional Note if needed (Allergies, etc.)" maxLength={300} />
            </Form.Item>

            <Button type="primary" htmlType="submit" block loading={saving} className="mp-save">
              {editing ? 'Save changes' : 'Add pet'}
            </Button>
          </Form>
        </div>
      </Modal>

      {/* ---------- confirm delete ---------- */}
      <Modal
        open={confirmOpen}
        onCancel={() => !deleting && setConfirmOpen(false)}
        centered
        maskClosable={false}
        title="Delete pets?"
        okText="Delete"
        okButtonProps={{ danger: true, loading: deleting }}
        cancelButtonProps={{ disabled: deleting }}
        onOk={confirmDelete}
      >
        <p style={{ margin: 0 }}>
          {selected.length === 1
            ? 'This pet will be removed from your account.'
            : `These ${selected.length} pets will be removed from your account.`}{' '}
          This cannot be undone.
        </p>
        {deleteError && <Alert type="error" showIcon title={deleteError} style={{ marginTop: 12 }} />}
      </Modal>
    </div>
  );
}

export default MyPets;