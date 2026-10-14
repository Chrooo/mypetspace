import DashboardShell from '../Layout/DashboardShell';
import { getUser } from '../../auth';

function CustomerDashboard() {
  const user = getUser();

  return (
    <DashboardShell
      title={`Hi, ${user.fullName}!`}
      subtitle="Your pets, bookings and receipts in one place."
      items={[
        { label: 'My Profile', desc: 'Your account details.', to: '/account/profile' },
        { label: 'Upcoming Reservations', desc: 'Hotel stays for your pets.', to: '/account/reservations' },
        { label: 'Appointments', desc: 'Grooming appointments and their status.', to: '/account/appointments' },
        { label: 'My Pets', desc: 'Your pets and their details.', to: '/account/pets' },
        { label: 'Payments and Receipts', desc: 'What you owe, what you paid.', to: '/account/payments' },
        { label: 'Book a Hotel Room', desc: 'Reserve a stay for your pet.', to: '/book/room' },
        { label: 'Book Grooming', desc: 'Choose a service, date and time.', to: '/book/grooming' },
      ]}
    />
  );
}

export default CustomerDashboard;