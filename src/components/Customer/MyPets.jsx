import DashboardShell from '../Layout/DashboardShell';

function MyPets() {
  return (
    <DashboardShell
      title="My Pets"
      back="/account"
      planned={[
        'List of my pets',
        'Add and edit pet details',
        'Vaccination notes',
        'Booking history of each pet',
      ]}
    />
  );
}

export default MyPets;