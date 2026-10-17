import DashboardShell from '../Layout/DashboardShell';

function MyBookings() {
  return (
    <DashboardShell
      title="My Bookings"
      back="/account"
      planned={[
        'All your hotel reservations and grooming appointments in one list',
        'Filter by type (Reservation or Appointment) and by status',
        'Upcoming and past bookings',
        'Cancel or reschedule, and see payment and receipt',
      ]}
    />
  );
}

export default MyBookings;