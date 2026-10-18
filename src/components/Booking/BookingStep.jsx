import { Link, Navigate, useParams } from 'react-router-dom';
import { Steps } from 'antd';
import { ArrowRightOutlined } from '@ant-design/icons';
import PageShell from '../Layout/PageShell';
import Planned from '../Layout/Planned';

// The order of the pages for each kind of booking.
// A grooming appointment ends at "confirmation" (no payment page, as in the design).
// A room booking is 5 steps: the "services" page is the Room Type page (it also holds the
// date range), then "slot" picks the check-in time and a free slot of that room type.
// "additional-services" and "schedule" are not part of it.
const FLOWS = {
  grooming: ['pet-details', 'services', 'schedule', 'confirmation'],
    room: ['pet-details', 'services', 'confirmation', 'payment'],
};

const STEP_LABELS = {
  'pet-details': 'Select Pet',
  services: 'Select Services',
  'additional-services': 'Additional Services',
  schedule: 'Select Date & Time',
  confirmation: 'Confirmation',
  payment: 'Payment',
};

// labels that differ for one kind of booking
const ROOM_STEP_LABELS = { ...STEP_LABELS, services: 'Room Type' };

const TYPE_TITLES = {
  grooming: 'Grooming Appointment',
  room: 'Hotel Room Reservation',
};

// Used by every booking page: shows the progress bar and the Back / Next buttons.
// subtitle: optional, replaces the default subtitle under the title
// children: real page content (shown above the "planned" box)
// canNext: set to false to disable Next until the step is complete (default true)
// hideActions: hides Back / Next (a page that has its own buttons, like the Slots section)
// customNext: optional button that replaces the Next button (the Confirmation page uses it)
function BookingStep({ step, title, subtitle, planned, children, canNext = true, customNext, hideActions = false }) {
  const { type } = useParams();
  const flow = FLOWS[type];

  if (!flow) return <Navigate to="/services" replace />;
  const index = flow.indexOf(step);
  if (index === -1) return <Navigate to={`/book/${type}/${flow[0]}`} replace />;

  const labels = type === 'room' ? ROOM_STEP_LABELS : STEP_LABELS;
  const isLast = index === flow.length - 1;
  // the first step goes back to the page the booking started from: Services (grooming) or Rooms (room)
  const firstBack = type === 'room' ? '/rooms' : '/services';
  const backTo = index > 0 ? `/book/${type}/${flow[index - 1]}` : firstBack;
  const nextTo = isLast ? '/receipts/sample' : `/book/${type}/${flow[index + 1]}`;
  const nextLabel = step === 'confirmation' ? 'Confirm booking' : isLast ? 'Submit payment' : 'Next';
  const nextContent = (
    <>
      {nextLabel}
      {nextLabel === 'Next' && <ArrowRightOutlined style={{ marginLeft: 8 }} />}
    </>
  );

  return (
    <PageShell title={title} subtitle={subtitle || TYPE_TITLES[type]}>
      <div className="page-steps">
        <Steps current={index} size="small" items={flow.map((s) => ({ title: labels[s] }))} />
      </div>

      {children}

      <Planned items={planned} />

      {!hideActions && (
      <div className="page-actions">
        <Link
          to={backTo}
          state={step === 'confirmation' ? { fromConfirmation: true } : undefined}
          onClick={() => window.scrollTo(0, 0)}
          className="btn btn-outline-teal"
        >
          Back
        </Link>
        {customNext ||
          (canNext ? (
            <Link to={nextTo} className="btn btn-pink">{nextContent}</Link>
          ) : (
            <button type="button" className="btn btn-pink" disabled>{nextContent}</button>
          ))}
      </div>
      )}
    </PageShell>
  );
}

export default BookingStep;