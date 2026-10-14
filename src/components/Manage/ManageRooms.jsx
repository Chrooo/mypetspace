import DashboardShell from '../Layout/DashboardShell';

function ManageRooms() {
  return (
    <DashboardShell
      title="Rooms"
      back
      planned={[
        'Room types, amenities and prices',
        'Add, edit or hide rooms',
        'Available and occupied rooms',
      ]}
    />
  );
}

export default ManageRooms;