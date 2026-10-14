import DashboardShell from '../Layout/DashboardShell';

function ManageAppointments() {
  return (
    <DashboardShell
      title="Appointments"
      back
      planned={[
        'All grooming appointments, filter by status and date',
        'Available slots and groomers',
        'Assign a groomer',
        'Update status: Pending, Confirmed, In Progress, Completed or Cancelled',
      ]}
    />
  );
}

export default ManageAppointments;