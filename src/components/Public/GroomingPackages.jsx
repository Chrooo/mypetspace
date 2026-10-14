import PageShell from '../Layout/PageShell';

function GroomingPackages() {
  return (
    <PageShell
      title="Grooming Packages"
      back="/services"
      links={[
        { label: 'Book an Appointment', to: '/book/grooming', primary: true },
      ]}
      planned={[
        'Packages and the services each one includes',
        'Price per package',
        'Duration of each package',
      ]}
    />
  );
}

export default GroomingPackages;