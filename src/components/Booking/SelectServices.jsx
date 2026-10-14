import BookingStep from './BookingStep';

function SelectServices() {
  return (
    <BookingStep
      step="services"
      title="Select Services"
      planned={[
        'Grooming: choose services or a package',
        'Hotel: choose a room type and number of nights',
        'Running price total',
      ]}
    />
  );
}

export default SelectServices;