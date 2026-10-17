import { useEffect, useState } from 'react';
import axios from 'axios';
import { Alert, Button, Input, Modal, Pagination, Spin } from 'antd';
import GroomerLayout from './GroomerLayout';
import { API_URL } from '../../auth';

const STATUS_LABELS = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

// the "Filter" drop-down (same order as the design)
const FILTERS = ['confirmed', 'pending', 'cancelled', 'in_progress', 'completed'];

const PAGE_SIZE = 10;

// "2026-10-14 14:00:00"
const two = (n) => String(n).padStart(2, '0');
const fmtDateTime = (value) => {
  const d = new Date(value);
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())} ${two(d.getHours())}:${two(d.getMinutes())}:${two(d.getSeconds())}`;
};

const StatusText = ({ status }) => <span className={`gr-st gr-st-${status}`}>{STATUS_LABELS[status] || status}</span>;

// Your assigned grooming appointments. Click one to see the pet, change its status and write grooming notes.
function GroomerAppointments() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState(''); // '' = All
  const [reload, setReload] = useState(0); // goes up by 1 to load the list again

  const [selected, setSelected] = useState(null); // the appointment open in the details window
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  useEffect(() => {
    let current = true; // ignore the answer if a newer request already started
    setLoading(true);
    axios
      .get(`${API_URL}/groomer/appointments`, { params: { page, pageSize: PAGE_SIZE, status: status || undefined } })
      .then(({ data }) => {
        if (!current) return;
        setRows(data.appointments);
        setTotal(data.total);
        setError('');
      })
      .catch((err) => current && setError(err.response?.data?.message || 'Could not load your appointments.'))
      .finally(() => current && setLoading(false));
    return () => {
      current = false;
    };
  }, [page, status, reload]);

  const open = (appointment) => {
    setSelected(appointment);
    setNotes(appointment.groomingNotes || '');
    setModalError('');
  };

  // change the status and/or save the notes of the open appointment
  const update = async (changes) => {
    setSaving(true);
    setModalError('');
    try {
      const { data } = await axios.put(`${API_URL}/groomer/appointments/${selected._id}`, changes);
      setSelected(data.appointment);
      setNotes(data.appointment.groomingNotes || '');
      setReload((n) => n + 1);
    } catch (err) {
      setModalError(err.response?.data?.message || 'Could not reach the server. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <GroomerLayout>
      <div className="gr-head">
        <div>
          <h1 className="gr-page-title">Appointments</h1>
          <p className="gr-hint">Click an appointment to see the pet, update its status or add grooming notes.</p>
        </div>
        <select
          className="gr-filter"
          value={status}
          aria-label="Filter by status"
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="" disabled hidden>Filter</option>
          {FILTERS.map((value) => (
            <option key={value} value={value}>{STATUS_LABELS[value]}</option>
          ))}
          <option value="">All</option>
        </select>
      </div>

      {error && <Alert type="error" showIcon title={error} style={{ marginBottom: 16 }} />}

      <Spin spinning={loading}>
        <div className="gr-table-wrap">
          <table className="gr-table">
            <thead>
              <tr>
                <th>No.</th>
                <th>Customer</th>
                <th>Pet Type</th>
                <th>Service</th>
                <th>Date &amp; Time</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={row._id}
                  tabIndex={0}
                  onClick={() => open(row)}
                  onKeyDown={(e) => e.key === 'Enter' && open(row)}
                >
                  <td>{(page - 1) * PAGE_SIZE + i + 1}</td>
                  <td>{row.customerName}</td>
                  <td>{row.petType}</td>
                  <td>{row.services.join(', ')}</td>
                  <td>{fmtDateTime(row.scheduledAt)}</td>
                  <td><StatusText status={row.status} /></td>
                </tr>
              ))}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="gr-empty">
                    {status ? `No ${STATUS_LABELS[status]} appointments.` : 'No appointments have been assigned to you yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Spin>

      <div className="gr-pages">
        <Pagination
          current={page}
          pageSize={PAGE_SIZE}
          total={total}
          showSizeChanger={false}
          hideOnSinglePage
          onChange={setPage}
        />
      </div>

      <Modal
        title="Appointment details"
        open={!!selected}
        onCancel={() => !saving && setSelected(null)}
        footer={null}
        destroyOnHidden
        width={560}
      >
        {selected && (
          <>
            <dl className="gr-detail">
              <dt>Customer</dt>
              <dd>{selected.customerName}</dd>
              <dt>Pet</dt>
              <dd>
                {selected.petName} ({selected.petType}
                {selected.petBreed ? `, ${selected.petBreed}` : ''}
                {selected.petAge !== undefined && selected.petAge !== null ? `, ${selected.petAge} yr` : ''}
                {selected.petGender ? `, ${selected.petGender}` : ''})
              </dd>
              <dt>Services</dt>
              <dd>{selected.services.join(', ')}</dd>
              <dt>Date &amp; time</dt>
              <dd>{fmtDateTime(selected.scheduledAt)}</dd>
              <dt>Status</dt>
              <dd><StatusText status={selected.status} /></dd>
            </dl>

            {selected.petNotes && (
              <div className="gr-allergy">
                <b>Note from the owner:</b> {selected.petNotes}
              </div>
            )}

            {selected.nextStatuses.length > 0 ? (
              <>
                <div className="gr-label">Update status</div>
                <div className="gr-status-buttons">
                  {selected.nextStatuses.map((next) => (
                    <Button
                      key={next}
                      danger={next === 'cancelled'}
                      loading={saving}
                      onClick={() => update({ status: next })}
                    >
                      {STATUS_LABELS[next]}
                    </Button>
                  ))}
                </div>
              </>
            ) : (
              <div className="gr-label">This appointment is {STATUS_LABELS[selected.status]}, so its status can no longer change.</div>
            )}

            <div className="gr-label">Grooming notes (for example allergies or skin problems you noticed)</div>
            <Input.TextArea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
              showCount
              rows={4}
              placeholder="Write your notes here"
            />
            <Button
              type="primary"
              style={{ marginTop: 12 }}
              loading={saving}
              disabled={notes.trim() === (selected.groomingNotes || '')}
              onClick={() => update({ groomingNotes: notes })}
            >
              Save notes
            </Button>

            {modalError && <Alert type="error" showIcon title={modalError} style={{ marginTop: 16 }} />}
          </>
        )}
      </Modal>
    </GroomerLayout>
  );
}

export default GroomerAppointments;