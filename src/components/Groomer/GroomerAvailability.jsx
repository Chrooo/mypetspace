import DashboardShell from '../Layout/DashboardShell';

function GroomerAvailability() {
  return (
    <DashboardShell
      title="My Availability"
      back="/groomer"
      planned={[
        'Working days and hours',
        'Days off and leave',
        'Blocked time slots',
      ]}
    />
  );
}

export default GroomerAvailability;