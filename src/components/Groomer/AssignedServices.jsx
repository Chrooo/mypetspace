import DashboardShell from '../Layout/DashboardShell';

function AssignedServices() {
  return (
    <DashboardShell
      title="Assigned Services"
      back="/groomer"
      planned={[
        'Today and upcoming appointments assigned to me',
        'Pet details and special instructions',
        'Services to do for each pet',
        'Update status: In Progress or Completed',
      ]}
    />
  );
}

export default AssignedServices;