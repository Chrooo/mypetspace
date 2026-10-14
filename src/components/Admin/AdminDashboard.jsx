import DashboardShell from '../Layout/DashboardShell';

function AdminDashboard() {
  return (
    <DashboardShell
      title="Admin Dashboard"
      subtitle="Overview of the hotel and the grooming salon."
      stats={[
        { label: 'Total reservations', value: '—' },
        { label: 'Available rooms', value: '—' },
        { label: 'Occupied rooms', value: '—' },
        { label: 'Total check-ins', value: '—' },
        { label: 'Total appointments', value: '—' },
        { label: 'Payments to verify', value: '—' },
      ]}
      items={[
        { label: 'Reservations', desc: 'Hotel room reservations.', to: '/manage/reservations' },
        { label: 'Rooms', desc: 'Room types, amenities, prices and availability.', to: '/manage/rooms' },
        { label: 'Appointments', desc: 'Grooming appointments and slots.', to: '/manage/appointments' },
        { label: 'Grooming Services', desc: 'Services, packages, durations and prices.', to: '/manage/services' },
        { label: 'Groomers', desc: 'Profiles, availability and assignments.', to: '/manage/groomers' },
        { label: 'Payments and Receipts', desc: 'Verify payments and view receipts.', to: '/manage/payments' },
        { label: 'Users and Roles', desc: 'Create staff and groomer accounts.', to: '/manage/users' },
      ]}
    />
  );
}

export default AdminDashboard;