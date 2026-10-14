import PageShell from '../Layout/PageShell';

function OurFacilities() {
  return (
    <PageShell
      title="Our Facilities"
      back="/about"
      planned={[
        'Pet hotel rooms',
        'Grooming salon',
        'Snack bar',
        'Play and rest areas',
      ]}
    />
  );
}

export default OurFacilities;