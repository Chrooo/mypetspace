import DashboardShell from '../Layout/DashboardShell';

function MyAppointments() {
  return (
    <DashboardShell
      title="My Appointments"
      back="/account"
      planned={[
        'Upcoming and past grooming appointments',
        'Status: Pending, Confirmed, In Progress, Completed or Cancelled',
        'Cancel or reschedule',
        'See payment and receipt',
      ]}
    />
  );
}

export default MyAppointments;