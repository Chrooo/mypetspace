import PageShell from '../Layout/PageShell';

function Services() {
  return (
    <PageShell
      title="Services"
      subtitle="Everything we offer for your fur babies."
      links={[
        { label: 'Grooming Services', to: '/services/grooming' },
        { label: 'Grooming Packages', to: '/services/packages' },
        { label: 'Book an Appointment', to: '/book/grooming', primary: true },
        { label: 'Book a Hotel Room', to: '/book/room', primary: true },
      ]}
    />
  );
}

export default Services;