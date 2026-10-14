import DashboardShell from '../Layout/DashboardShell';

function ManageGroomers() {
  return (
    <DashboardShell
      title="Groomers"
      back
      planned={[
        'Groomer profiles',
        'Availability and schedules',
        'Assigned services on each pet',
      ]}
    />
  );
}

export default ManageGroomers;