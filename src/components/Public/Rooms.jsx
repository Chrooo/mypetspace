import PageShell from '../Layout/PageShell';

function Rooms() {
  return (
    <PageShell
      title="Rooms"
      subtitle="Comfortable stays for your pets."
      links={[
        { label: 'Book a Hotel Room', to: '/book/room', primary: true },
      ]}
      planned={[
        'Room types',
        'Amenities',
        'Prices per night',
        'Available rooms for the dates you choose',
      ]}
    />
  );
}

export default Rooms;