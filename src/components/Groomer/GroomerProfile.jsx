import DashboardShell from '../Layout/DashboardShell';

function GroomerProfile() {
  return (
    <DashboardShell
      title="My Profile"
      back="/groomer"
      planned={[
        'Photo, name and short bio',
        'Specialties',
        'Contact details',
      ]}
    />
  );
}

export default GroomerProfile;