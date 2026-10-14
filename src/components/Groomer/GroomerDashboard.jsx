import DashboardShell from '../Layout/DashboardShell';

function GroomerDashboard() {
  return (
    <DashboardShell
      title="Groomer Dashboard"
      subtitle="Your schedule and the pets assigned to you."
      stats={[
        { label: 'Today\'s appointments', value: '—' },
        { label: 'In progress', value: '—' },
        { label: 'Completed today', value: '—' },
      ]}
      items={[
        { label: 'My Profile', desc: 'Your details and specialties.', to: '/groomer/profile' },
        { label: 'My Availability', desc: 'Working days, hours and days off.', to: '/groomer/availability' },
        { label: 'Assigned Services', desc: 'The services assigned to each pet.', to: '/groomer/assignments' },
      ]}
    />
  );
}

export default GroomerDashboard;