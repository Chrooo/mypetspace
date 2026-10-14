import DashboardShell from '../Layout/DashboardShell';

function MyReservations() {
  return (
    <DashboardShell
      title="Upcoming Reservations"
      back="/account"
      planned={[
        'Upcoming and past hotel reservations',
        'Status: Pending, Confirmed, Checked In, Checked Out or Cancelled',
        'Cancel a reservation',
        'See payment and receipt',
      ]}
    />
  );
}

export default MyReservations;