import DashboardShell from '../Layout/DashboardShell';

function Profile() {
  return (
    <DashboardShell
      title="My Profile"
      back="/account"
      planned={[
        'Name, email or phone number',
        'Address',
        'Change password',
      ]}
    />
  );
}

export default Profile;