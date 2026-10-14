import PageShell from '../Layout/PageShell';

function GroomingServices() {
  return (
    <PageShell
      title="Grooming Services"
      back="/services"
      links={[
        { label: 'Book an Appointment', to: '/book/grooming', primary: true },
      ]}
      planned={[
        'Bath',
        'Blow-drying',
        'Haircut',
        'Nail trimming',
        'Ear cleaning',
        'Full package',
        'Duration and price of each service',
      ]}
    />
  );
}

export default GroomingServices;