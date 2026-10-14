import PageShell from '../Layout/PageShell';

function Groomers() {
  return (
    <PageShell
      title="Groomers"
      subtitle="Meet the people who take care of your pets."
      links={[
        { label: 'Book an Appointment', to: '/book/grooming', primary: true },
      ]}
      planned={[
        'Groomer profiles',
        'Specialties',
        'Availability',
      ]}
    />
  );
}

export default Groomers;