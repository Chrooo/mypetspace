import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Alert, DatePicker, Spin } from 'antd';
import dayjs from 'dayjs';
import StaffLayout from '../Staff/StaffLayout';
import { API_URL } from '../../auth';

const STATUS_LABEL = { pending: 'Pending', confirmed: 'Confirmed', checked_in: 'Checked in' };

// Rooms: for the chosen day, every room type and which of its slots are taken (and by which pet).
function ManageRooms() {
  const [date, setDate] = useState(dayjs());
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setData(null);
    axios
      .get(`${API_URL}/staff/rooms`, { params: { date: date.format('YYYY-MM-DD') } })
      .then((r) => active && (setData(r.data), setError('')))
      .catch((err) => active && setError(err.response?.data?.message || 'Could not load the rooms.'));
    return () => {
      active = false;
    };
  }, [date]);

  return (
    <StaffLayout>
      <div className="adm-head">
        <div>
          <h1 className="adm-title">ROOMS</h1>
          <p className="adm-sub">Which slots are free or occupied on the chosen day.</p>
        </div>
        <div className="adm-tools">
          <DatePicker value={date} allowClear={false} onChange={(d) => d && setDate(d)} format="MMM DD, YYYY" />
        </div>
      </div>

      {error && <Alert type="error" showIcon title={error} style={{ marginBottom: 16 }} />}
      {!data && !error && <div style={{ padding: 40, textAlign: 'center' }}><Spin size="large" /></div>}

      {data && (
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {data.rooms.map((room) => (
            <section key={room.id} style={{ padding: 16, background: '#fff', border: '1px solid #e7d9c9', borderRadius: 14 }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>{room.name}</h2>
              <p style={{ margin: '2px 0 12px', fontSize: 13 }}>
                <b>{room.occupied}</b> of {room.maxPets} slots occupied - <b style={{ color: room.free === 0 ? '#c0392b' : '#0E969C' }}>{room.free === 0 ? 'FULL' : `${room.free} free`}</b>
              </p>
              <div style={{ display: 'grid', gap: 6 }}>
                {room.slots.map((s) => (
                  <div
                    key={s.slot}
                    style={{ padding: '6px 10px', fontSize: 13, borderRadius: 8, background: s.stays.length ? '#fde7ef' : '#e8f6f6', border: `1px solid ${s.stays.length ? '#EE2A7B' : '#0E969C'}` }}
                  >
                    <b>Slot {s.slot}</b>{' '}
                    {s.stays.length === 0
                      ? '- free'
                      : s.stays.map((st) => (
                          <span key={st._id} style={{ display: 'block' }}>
                            {st.petName} ({st.customerName}) - {STATUS_LABEL[st.status] || st.status}
                            {room.kind === 'day' && ` ${dayjs(st.checkInAt).format('h:mm A')}${st.checkOutAt ? `-${dayjs(st.checkOutAt).format('h:mm A')}` : ''}`}
                          </span>
                        ))}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
      <p style={{ marginTop: 18 }}><Link to="/manage/reservations">Open Hotel Stays</Link> to check pets in or out.</p>
    </StaffLayout>
  );
}

export default ManageRooms;