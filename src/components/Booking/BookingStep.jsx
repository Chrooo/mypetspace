import { Link, Navigate, useParams } from 'react-router-dom';
import { Steps } from 'antd';
import PageShell from '../Layout/PageShell';
import Planned from '../Layout/Planned';

// The order of the pages for each kind of booking.
// A grooming appointment skips "additional-services" (only shown when a room is booked).
const FLOWS = {
  grooming: ['pet-details', 'services', 'schedule', 'confirmation', 'payment'],
  room: ['pet-details', 'services', 'additional-services', 'schedule', 'confirmation', 'payment'],
};

const STEP_LABELS = {
  'pet-details': 'Pet Details',
  services: 'Select Services',
  'additional-services': 'Additional Services',
  schedule: 'Time and Date',
  confirmation: 'Confirmation',
  payment: 'Payment',
};

const TYPE_TITLES = {
  grooming: 'Grooming Appointment',
  room: 'Hotel Room Reservation',
};

// Used by every booking page: shows the progress bar and the Back / Next buttons.
function BookingStep({ step, title, planned }) {
  const { type } = useParams();
  const flow = FLOWS[type];

  if (!flow) return <Navigate to="/services" replace />;
  const index = flow.indexOf(step);
  if (index === -1) return <Navigate to={`/book/${type}/${flow[0]}`} replace />;

  const isLast = index === flow.length - 1;
  const backTo = index > 0 ? `/book/${type}/${flow[index - 1]}` : '/services';
  const nextTo = isLast ? '/receipts/sample' : `/book/${type}/${flow[index + 1]}`;
  const nextLabel = step === 'confirmation' ? 'Confirm booking' : isLast ? 'Submit payment' : 'Next';

  return (
    <PageShell title={title} subtitle={TYPE_TITLES[type]}>
      <div className="page-steps">
        <Steps current={index} size="small" items={flow.map((s) => ({ title: STEP_LABELS[s] }))} />
      </div>

      <Planned items={planned} />

      <div className="page-actions">
        <Link to={backTo} className="btn btn-outline-teal">Back</Link>
        <Link to={nextTo} className="btn btn-pink">{nextLabel}</Link>
      </div>
    </PageShell>
  );
}

export default BookingStep;