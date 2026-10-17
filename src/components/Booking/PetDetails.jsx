import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useParams } from 'react-router-dom';
import { Alert, Select, Spin } from 'antd';
import { API_URL } from '../../auth';
import BookingStep from './BookingStep';
import './Booking.css';

const ageText = (age) => `${age} ${Number(age) === 1 ? 'year' : 'years'} old`;

const PawIcon = () => (
  <svg viewBox="0 0 64 64" fill="currentColor" aria-hidden="true">
    <ellipse cx="13" cy="30" rx="6" ry="8" transform="rotate(-20 13 30)" />
    <ellipse cx="25" cy="16" rx="6.5" ry="9" transform="rotate(-8 25 16)" />
    <ellipse cx="41" cy="16" rx="6.5" ry="9" transform="rotate(8 41 16)" />
    <ellipse cx="53" cy="30" rx="6" ry="8" transform="rotate(20 53 30)" />
    <path d="M32 29c-9 0-18 10-18 19 0 7 6 10 11 9 3-1 5-2 7-2s4 1 7 2c5 1 11-2 11-9 0-9-9-19-18-19z" />
  </svg>
);

// The chosen pet is remembered for the next booking steps.
// Later pages can read it with: sessionStorage.getItem(`booking:${type}:pet`)  ->  the pet's _id
const storageKey = (type) => `booking:${type}:pet`;
const readSaved = (type) => {
  try {
    return sessionStorage.getItem(storageKey(type));
  } catch (err) {
    return null;
  }
};
const writeSaved = (type, id) => {
  try {
    sessionStorage.setItem(storageKey(type), id);
  } catch (err) {
    /* storage unavailable: the choice just won't be remembered */
  }
};

// Step 1 of every booking: choose ONE of the user's registered pets.
function PetDetails() {
  const { type } = useParams();
  const [pets, setPets] = useState(null); // null = still loading
  const [loadError, setLoadError] = useState('');
  const [petId, setPetId] = useState(null); // only one pet per booking

  useEffect(() => {
    let active = true;
    axios
      .get(`${API_URL}/pets`)
      .then(({ data }) => {
        if (!active) return;
        setPets(data.pets);
        setLoadError('');
        const saved = readSaved(type);
        if (saved && data.pets.some((p) => p._id === saved)) setPetId(saved); // came back from a later step
      })
      .catch((err) => {
        if (!active) return;
        setPets([]);
        setLoadError(err.response?.data?.message || 'Could not load your pets. Please try again.');
      });
    return () => {
      active = false;
    };
  }, [type]);

  const list = pets || [];
  const pet = list.find((p) => p._id === petId) || null;

  const onChoose = (id) => {
    setPetId(id);
    writeSaved(type, id);
  };

  return (
    <BookingStep
      step="pet-details"
      title={type === 'grooming' ? 'Book an Appointment' : 'Select Your Pet'}
      subtitle={type === 'grooming' ? 'Select your preferred date, time, and groomer' : undefined}
      canNext={!!pet}
    >
      {loadError && <Alert type="error" showIcon title={loadError} className="bk-alert" />}

      <section className="bk-body">
        <div className="bk-pick">
          <label htmlFor="bk-pet" className="bk-label">Select a Pet</label>
          <Select
            id="bk-pet"
            className="bk-select"
            placeholder="Choose from your registered pets"
            value={petId}
            onChange={onChoose}
            loading={pets === null}
            disabled={pets === null || list.length === 0}
            options={list.map((p) => ({ value: p._id, label: `${p.name} (${p.breed})` }))}
          />
          <p className="bk-hint">One pet per booking. To book another pet, make a separate booking.</p>
        </div>

        <div className="bk-card" aria-live="polite">
          {pets === null ? (
            <div className="bk-empty"><Spin /></div>
          ) : list.length === 0 ? (
            <div className="bk-empty">
              <strong>No pets registered yet</strong>
              <span>Add a pet in your dashboard to continue.</span>
              <Link to="/account/pets" className="btn btn-outline-teal">Add a Pet</Link>
            </div>
          ) : !pet ? (
            <div className="bk-empty">
              <strong>No pet selected</strong>
              <span>Choose a pet to see its details here.</span>
            </div>
          ) : (
            <>
              <div className="bk-pet-head">
                <div className="bk-photo">
                  {pet.photo ? <img src={pet.photo} alt={pet.name} /> : <PawIcon />}
                </div>
                <div>
                  <h2>{pet.name}</h2>
                  <p>{pet.type} - {pet.gender}</p>
                </div>
              </div>
              <dl className="bk-details">
                <dt>Type</dt><dd>{pet.type}</dd>
                <dt>Gender</dt><dd>{pet.gender}</dd>
                <dt>Breed</dt><dd>{pet.breed}</dd>
                <dt>Age</dt><dd>{ageText(pet.age)}</dd>
                <dt>Notes</dt><dd>{pet.notes || 'None'}</dd>
              </dl>
            </>
          )}
        </div>
      </section>
    </BookingStep>
  );
}

export default PetDetails;