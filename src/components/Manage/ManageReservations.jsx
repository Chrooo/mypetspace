import DashboardShell from '../Layout/DashboardShell';

function ManageReservations() {
  return (
    <DashboardShell
      title="Reservations"
      back
      planned={[
        'All room reservations, filter by status and date',
        'Guest and pet details',
        'Confirm or cancel a reservation',
        'Check in and check out',
        'Track booking status',
      ]}
    />
  );
}

export default ManageReservations;