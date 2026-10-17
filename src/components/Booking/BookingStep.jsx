import { Link, Navigate, useParams } from 'react-router-dom';
import { Steps } from 'antd';
import { ArrowRightOutlined } from '@ant-design/icons';
import PageShell from '../Layout/PageShell';
import Planned from '../Layout/Planned';

// The order of the pages for each kind of booking.
// A grooming appointment skips "additional-services" (only shown when a room is booked).
// A grooming appointment ends at "confirmation" (no payment page, as in the design).
const FLOWS = {
  grooming: ['pet-details', 'services', 'schedule', 'confirmation'],
  room: ['pet-details', 'services', 'additional-services', 'schedule', 'confirmation', 'payment'],
};

const STEP_LABELS = {
  'pet-details': 'Select Pet',
  services: 'Select Services',
  'additional-services': 'Additional Services',
  schedule: 'Select Date & Time',
  confirmation: 'Confirmation',
  payment: 'Payment',
};

const TYPE_TITLES = {
  grooming: 'Grooming Appointment',
  room: 'Hotel Room Reservation',
};

// Used by every booking page: shows the progress bar and the Back / Next buttons.
// subtitle: optional, replaces the default subtitle under the title
// children: real page content (shown above the "planned" box)
// canNext: set to false to disable Next until the step is complete (default true)
// customNext: optional button that replaces the Next button (the Confirmation page uses it)
function BookingStep({ step, title, subtitle, planned, children, canNext = true, customNext }) {
  const { type } = useParams();
  const flow = FLOWS[type];

  if (!flow) return <Navigate to="/services" replace />;
  const index = flow.indexOf(step);
  if (index === -1) return <Navigate to={`/book/${type}/${flow[0]}`} replace />;

  const isLast = index === flow.length - 1;
  const backTo = index > 0 ? `/book/${type}/${flow[index - 1]}` : '/services';
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
        <Steps current={index} size="small" items={flow.map((s) => ({ title: STEP_LABELS[s] }))} />
      </div>

      {children}

      <Planned items={planned} />

      <div className="page-actions">
        <Link to={backTo} className="btn btn-outline-teal">Back</Link>
        {customNext ||
          (canNext ? (
            <Link to={nextTo} className="btn btn-pink">{nextContent}</Link>
          ) : (
            <button type="button" className="btn btn-pink" disabled>{nextContent}</button>
          ))}
      </div>
    </PageShell>
  );
}

export default BookingStep;