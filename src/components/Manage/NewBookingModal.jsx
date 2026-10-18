import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import { Alert, Button, DatePicker, Input, InputNumber, Modal, Radio, Segmented, Select, Spin, message } from 'antd';
import { API_URL } from '../../auth';
import { CHOICE_HOURS, MIN_DAY_HOURS, ROOM_OPTIONS, findRoom, hourLabel, stayTotal, timeValue } from '../../data/roomOptions';

// "New booking" window for staff and admin: book a grooming appointment or a hotel room for a customer
// (walk-in or phone call) and take the payment on the spot. It follows the same steps as the customer booking
// pages: customer + pet -> service / room -> date and time -> slot -> payment.
const SERVICES = [
  { value: 'Bath-Dry', label: 'Bath & Dry' },
  { value: 'Tear Strain', label: 'Tear Strain' },
  { value: 'Eye Cleaning', label: 'Eye Cleaning' },
  { value: 'Nail Trimming', label: 'Nail Trimming' },
  { value: 'Ear Cleaning', label: 'Ear Cleaning' },
  { value: 'Dematting', label: 'Dematting' },
  { value: 'Basic Groom', label: 'Basic Groom Package' },
  { value: 'Full Groom', label: 'Full Groom Package' },
  { value: 'Groom & Massage', label: 'Groom & Massage Package' },
];
const PACKAGES = ['Basic Groom', 'Full Groom', 'Groom & Massage'];
const PAY_OPTIONS = [
  { value: 'CASH', label: 'Cash (paid now)' },
  { value: 'GCASH', label: 'GCash (paid now)' },
  { value: 'MAYA', label: 'Maya (paid now)' },
  { value: 'BANK', label: 'Bank transfer (paid now)' },
  { value: '', label: 'Pay later' },
];
const peso = (n) => `₱${Number(n || 0).toLocaleString('en-PH')}`;
const EMPTY_PET = { name: '', type: 'Dog', breed: '', age: null, gender: 'Male', notes: '' };
const row = { display: 'grid', gap: 4, marginBottom: 12 };

function NewBookingModal({ open, initialType, onClose, onCreated }) {
  const [type, setType] = useState(initialType); // 'grooming' | 'hotel'
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // ----- customer and pet -----
  const [customers, setCustomers] = useState([]);
  const [customer, setCustomer] = useState(null); // { _id, name, identifier, pets }
  const [petId, setPetId] = useState(null);
  const [walkIn, setWalkIn] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ firstName: '', lastName: '', identifier: '', pet: EMPTY_PET });
  const [tempPassword, setTempPassword] = useState('');

  // ----- grooming -----
  const [services, setServices] = useState([]);
  const [date, setDate] = useState(null);
  const [slots, setSlots] = useState(null);
  const [time, setTime] = useState(null);
  const [groomers, setGroomers] = useState([]);
  const [groomerId, setGroomerId] = useState(null);
  const [amount, setAmount] = useState(null);

  // ----- hotel -----
  const [roomId, setRoomId] = useState(null);
  const [start, setStart] = useState(null);
  const [end, setEnd] = useState(null);
  const [inHour, setInHour] = useState(null);
  const [outHour, setOutHour] = useState(null);
  const [roomSlots, setRoomSlots] = useState(null);
  const [slot, setSlot] = useState(null);
  const [price, setPrice] = useState(null); // Peak/Holiday only
  const [share, setShare] = useState('full'); // 'full' | 'half'

  const [method, setMethod] = useState('CASH');

  // start fresh every time the window opens
  useEffect(() => {
    if (!open) return;
    setType(initialType);
    setError('');
    setCustomer(null); setPetId(null); setWalkIn(false); setTempPassword('');
    setNewCustomer({ firstName: '', lastName: '', identifier: '', pet: EMPTY_PET });
    setServices([]); setDate(null); setSlots(null); setTime(null); setGroomerId(null); setAmount(null);
    setRoomId(null); setStart(null); setEnd(null); setInHour(null); setOutHour(null); setRoomSlots(null); setSlot(null); setPrice(null); setShare('full');
    setMethod('CASH');
    searchCustomers('');
    axios.get(`${API_URL}/staff/groomers`).then((r) => setGroomers(r.data.groomers)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const searchCustomers = (text) =>
    axios
      .get(`${API_URL}/staff/customers`, { params: { search: text } })
      .then((r) => setCustomers(r.data.customers))
      .catch(() => {});

  // ----- grooming: open time slots of the chosen day -----
  useEffect(() => {
    if (type !== 'grooming' || !date) {
      setSlots(null);
      return undefined;
    }
    let active = true;
    axios
      .get(`${API_URL}/appointments/availability`, { params: { date } })
      .then((r) => {
        if (!active) return;
        setSlots(r.data.slots);
        setTime((old) => (old && r.data.slots.some((s) => s.time === old && !s.full && !s.past) ? old : null));
      })
      .catch(() => active && setSlots([]));
    return () => {
      active = false;
    };
  }, [type, date]);

  // ----- hotel -----
  const room = findRoom(roomId);
  const isDay = room?.kind === 'day';
  const effectiveEnd = isDay ? start : end;
  const nights = start && effectiveEnd ? dayjs(effectiveEnd).diff(dayjs(start), 'day') : 0;
  const hours = isDay && inHour !== null && outHour !== null ? outHour - inHour : null;
  const total = room && start && effectiveEnd && inHour !== null && outHour !== null ? (room.price === null ? Number(price) || null : stayTotal(room, nights, hours)) : null;
  const hotelReady = !!room && !!start && !!effectiveEnd && inHour !== null && outHour !== null && (!isDay || (hours >= MIN_DAY_HOURS));

  useEffect(() => {
    if (type !== 'hotel' || !hotelReady) {
      setRoomSlots(null);
      return undefined;
    }
    let active = true;
    axios
      .get(`${API_URL}/rooms/slots`, {
        params: { roomId, start, end: effectiveEnd, time: isDay ? timeValue(inHour) : undefined, outTime: isDay ? timeValue(outHour) : undefined },
      })
      .then((r) => {
        if (!active) return;
        setRoomSlots(r.data.slots);
        setSlot((old) => (old && r.data.slots.some((s) => s.slot === old && !s.taken) ? old : null));
      })
      .catch((err) => {
        if (!active) return;
        setRoomSlots([]);
        setError(err.response?.data?.message || 'Could not load the slots.');
      });
    return () => {
      active = false;
    };
  }, [type, hotelReady, roomId, start, effectiveEnd, isDay, inHour, outHour]);

  const pickService = (list) => {
    // only ONE package at a time (the newest one chosen wins)
    const packages = list.filter((n) => PACKAGES.includes(n));
    setServices(packages.length > 1 ? [...list.filter((n) => !PACKAGES.includes(n)), packages[packages.length - 1]] : list);
  };

  const registerWalkIn = async () => {
    setSaving(true);
    setError('');
    try {
      const { data } = await axios.post(`${API_URL}/staff/customers`, newCustomer);
      setCustomer(data.customer);
      setPetId(data.customer.pets[0]._id);
      setTempPassword(data.tempPassword);
      setWalkIn(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not register the customer.');
    } finally {
      setSaving(false);
    }
  };

  const hotelDue = total && method ? (share === 'full' ? total : Math.round(total / 2)) : 0;
  const problem = useMemo(() => {
    if (!customer || !petId) return 'Choose the customer and the pet.';
    if (type === 'grooming') {
      if (services.length === 0) return 'Choose at least one service or a package.';
      if (!date || !time) return 'Choose a date and a time.';
      if (method && !(amount > 0)) return 'Enter the amount paid.';
    } else {
      if (!room) return 'Choose a room.';
      if (!start || (!isDay && !end)) return 'Choose the check-in and check-out dates.';
      if (inHour === null || outHour === null) return 'Choose the check-in and check-out times.';
      if (isDay && hours < MIN_DAY_HOURS) return `Day Boarding is at least ${MIN_DAY_HOURS} hours.`;
      if (room.price === null && !(Number(price) > 0)) return 'Enter the price of this Peak/Holiday stay.';
      if (!slot) return 'Choose a slot.';
    }
    return '';
  }, [type, customer, petId, services, date, time, method, amount, room, start, end, isDay, inHour, outHour, hours, price, slot]);

  const submit = async () => {
    setSaving(true);
    setError('');
    try {
      if (type === 'grooming') {
        await axios.post(`${API_URL}/staff/appointments`, {
          customerId: customer._id, petId, services, date, time, groomerId: groomerId || undefined,
          total: amount || undefined, paymentMethod: method || undefined,
        });
      } else {
        await axios.post(`${API_URL}/staff/reservations`, {
          customerId: customer._id, petId, roomId, slot, start, end: effectiveEnd, time: timeValue(inHour), outTime: timeValue(outHour),
          price: room.price === null ? price : undefined, paymentMethod: method || undefined, payment: method ? share : undefined,
        });
      }
      message.success('Booking created and confirmed.');
      onCreated(type);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create the booking.');
    } finally {
      setSaving(false);
    }
  };

  const disabledDate = (d) => d && d.endOf('day').valueOf() < Date.now();
  const setPet = (k) => (e) => setNewCustomer((c) => ({ ...c, pet: { ...c.pet, [k]: e && e.target ? e.target.value : e } }));
  const setField = (k) => (e) => setNewCustomer((c) => ({ ...c, [k]: e.target.value }));
  const selectedPets = customer?.pets || [];

  return (
    <Modal open={open} onCancel={onClose} title="New booking" width={720} centered destroyOnHidden
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" loading={saving} disabled={!!problem} onClick={submit} title={problem}>Create booking</Button>
        </>
      }
    >
      <Segmented block value={type} onChange={(v) => { setType(v); setError(''); }} style={{ marginBottom: 16 }}
        options={[{ label: 'Grooming Appointment', value: 'grooming' }, { label: 'Hotel Reservation', value: 'hotel' }]} />

      {error && <Alert type="error" showIcon title={error} style={{ marginBottom: 12 }} />}
      {tempPassword && (
        <Alert type="success" showIcon style={{ marginBottom: 12 }} title="Customer registered"
          description={<>Temporary password for <b>{customer?.identifier}</b>: <b>{tempPassword}</b>. It is shown only once - give it to the customer so they can log in and see their receipts.</>} />
      )}

      {/* 1. customer and pet */}
      <h4>1. Customer and pet</h4>
      {!walkIn ? (
        <>
          <div style={row}>
            <label>Customer</label>
            <Select showSearch filterOption={false} value={customer?._id} placeholder="Search by name, email or phone"
              onSearch={searchCustomers} notFoundContent={<span>No customer found</span>}
              options={customers.map((c) => ({ value: c._id, label: `${c.name} (${c.identifier})` }))}
              onChange={(id) => { setCustomer(customers.find((c) => c._id === id)); setPetId(null); setTempPassword(''); }} />
            <Button type="link" style={{ justifySelf: 'start', padding: 0 }} onClick={() => setWalkIn(true)}>New walk-in customer</Button>
          </div>
          {customer && (
            <div style={row}>
              <label>Pet</label>
              <Select value={petId} placeholder="Choose a pet" onChange={setPetId}
                options={selectedPets.map((p) => ({ value: p._id, label: `${p.name} (${p.type}, ${p.breed})` }))} />
            </div>
          )}
        </>
      ) : (
        <div style={{ display: 'grid', gap: 8, marginBottom: 12, padding: 12, border: '1px dashed #bbb', borderRadius: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <Input placeholder="First name" value={newCustomer.firstName} onChange={setField('firstName')} />
            <Input placeholder="Last name" value={newCustomer.lastName} onChange={setField('lastName')} />
          </div>
          <Input placeholder="Email or mobile number (09123456789)" value={newCustomer.identifier} onChange={setField('identifier')} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <Input placeholder="Pet name" value={newCustomer.pet.name} onChange={setPet('name')} />
            <Select value={newCustomer.pet.type} onChange={setPet('type')} options={['Dog', 'Cat'].map((v) => ({ value: v, label: v }))} />
            <Input placeholder="Breed" value={newCustomer.pet.breed} onChange={setPet('breed')} />
            <InputNumber min={0} max={40} placeholder="Age (years)" value={newCustomer.pet.age} onChange={setPet('age')} style={{ width: '100%' }} />
            <Select value={newCustomer.pet.gender} onChange={setPet('gender')} options={['Male', 'Female'].map((v) => ({ value: v, label: v }))} />
            <Input placeholder="Notes (optional)" value={newCustomer.pet.notes} onChange={setPet('notes')} />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button onClick={() => setWalkIn(false)}>Back to search</Button>
            <Button type="primary" loading={saving} onClick={registerWalkIn}>Register customer</Button>
          </div>
        </div>
      )}

      {/* 2. grooming or hotel details */}
      {type === 'grooming' ? (
        <>
          <h4>2. Services</h4>
          <div style={row}>
            <Select mode="multiple" value={services} onChange={pickService} options={SERVICES} placeholder="Choose services or one package" />
          </div>
          <h4>3. Date and time</h4>
          <div style={row}>
            <DatePicker value={date ? dayjs(date) : null} onChange={(d) => { setDate(d ? d.format('YYYY-MM-DD') : null); setTime(null); }} disabledDate={disabledDate} format="MMM DD, YYYY" style={{ width: '100%' }} />
            {date && !slots && <Spin size="small" />}
            {slots && (
              <Radio.Group value={time} onChange={(e) => setTime(e.target.value)} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {slots.map((s) => (
                  <Radio.Button key={s.time} value={s.time} disabled={s.full || s.past}>
                    {s.label}{s.full ? ' (full)' : ''}
                  </Radio.Button>
                ))}
              </Radio.Group>
            )}
          </div>
          <div style={row}>
            <label>Groomer</label>
            <Select allowClear value={groomerId} onChange={setGroomerId} placeholder="Auto-assign a free groomer" options={groomers.map((g) => ({ value: g._id, label: g.name }))} />
          </div>
          <h4>4. Payment</h4>
          <div style={row}>
            <label>Amount (₱) - grooming prices depend on the pet&apos;s size</label>
            <InputNumber min={0} value={amount} onChange={setAmount} style={{ width: '100%' }} />
          </div>
        </>
      ) : (
        <>
          <h4>2. Room and dates</h4>
          <div style={row}>
            <Select value={roomId} onChange={(v) => { setRoomId(v); setSlot(null); setOutHour(null); }} placeholder="Choose a room"
              options={ROOM_OPTIONS.map((r) => ({ value: r.id, label: `${r.name}${r.sub ? ` (${r.sub})` : ''} - ${r.priceText}` }))} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
            <DatePicker placeholder="Check-in date" value={start ? dayjs(start) : null} disabledDate={disabledDate} format="MMM DD, YYYY"
              onChange={(d) => { setStart(d ? d.format('YYYY-MM-DD') : null); if (end && d && !dayjs(end).isAfter(d)) setEnd(null); setSlot(null); }} />
            <DatePicker placeholder={isDay ? 'Same day' : 'Check-out date'} disabled={isDay} value={effectiveEnd ? dayjs(effectiveEnd) : null} format="MMM DD, YYYY"
              disabledDate={(d) => !start || !d.isAfter(dayjs(start), 'day')} onChange={(d) => { setEnd(d ? d.format('YYYY-MM-DD') : null); setSlot(null); }} />
            <Select placeholder="Check-in time" value={inHour} onChange={(v) => { setInHour(v); setSlot(null); if (isDay && outHour !== null && outHour - v < MIN_DAY_HOURS) setOutHour(null); }}
              options={CHOICE_HOURS.map((h) => ({ value: h, label: hourLabel(h) }))} />
            <Select placeholder="Check-out time" value={outHour} onChange={(v) => { setOutHour(v); setSlot(null); }}
              options={CHOICE_HOURS.map((h) => ({ value: h, label: hourLabel(h), disabled: isDay && inHour !== null && h - inHour < MIN_DAY_HOURS }))} />
          </div>
          {room && room.price === null && (
            <div style={row}>
              <label>Price of the whole stay (₱) - Peak/Holiday</label>
              <InputNumber min={1} value={price} onChange={setPrice} style={{ width: '100%' }} />
            </div>
          )}
          <h4>3. Slot</h4>
          <div style={row}>
            {!hotelReady && <small>Choose the room, dates and times to see the free slots.</small>}
            {hotelReady && !roomSlots && <Spin size="small" />}
            {roomSlots && (
              <Radio.Group value={slot} onChange={(e) => setSlot(e.target.value)} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {roomSlots.map((s) => (
                  <Radio.Button key={s.slot} value={s.slot} disabled={s.taken}>Slot {s.slot}{s.taken ? ' (taken)' : ''}</Radio.Button>
                ))}
              </Radio.Group>
            )}
          </div>
          <h4>4. Payment</h4>
          <div style={row}>
            <b>Total: {total ? peso(total) : 'to be set'}</b>
          </div>
        </>
      )}

      <div style={row}>
        <label>Payment method</label>
        <Select value={method} onChange={setMethod} options={PAY_OPTIONS} />
      </div>
      {type === 'hotel' && method && (
        <div style={row}>
          <Radio.Group value={share} onChange={(e) => setShare(e.target.value)}>
            <Radio value="full">Paid in full{total ? ` (${peso(total)})` : ''}</Radio>
            <Radio value="half">Downpayment 50%{total ? ` (${peso(Math.round(total / 2))})` : ''}</Radio>
          </Radio.Group>
          {hotelDue > 0 && <small>The remaining balance can be recorded later on Hotel Stays.</small>}
        </div>
      )}
      <small>The booking is created as <b>Confirmed</b>.{method ? ' A receipt is made right away.' : ''}</small>
    </Modal>
  );
}

export default NewBookingModal;