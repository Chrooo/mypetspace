import DashboardShell from '../Layout/DashboardShell';

function StaffDashboard() {
  return (
    <DashboardShell
      title="Staff Dashboard"
      subtitle="Daily work at the front desk."
      stats={[
        { label: 'Today\'s check-ins', value: '—' },
        { label: 'Today\'s check-outs', value: '—' },
        { label: 'Pending appointments', value: '—' },
        { label: 'Payments to verify', value: '—' },
      ]}
      items={[
        { label: 'Reservations', desc: 'Confirm, cancel, check in and check out.', to: '/manage/reservations' },
        { label: 'Rooms', desc: 'Available and occupied rooms.', to: '/manage/rooms' },
        { label: 'Appointments', desc: 'Grooming appointments and status.', to: '/manage/appointments' },
        { label: 'Grooming Services', desc: 'Services, packages and prices.', to: '/manage/services' },
        { label: 'Groomers', desc: 'Groomer schedules.', to: '/manage/groomers' },
        { label: 'Payments and Receipts', desc: 'Record and verify payments.', to: '/manage/payments' },
      ]}
    />
  );
}

export default StaffDashboard;