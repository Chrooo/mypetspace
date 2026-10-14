import BookingStep from './BookingStep';

function AdditionalServices() {
  return (
    <BookingStep
      step="additional-services"
      title="Select Additional Services"
      planned={[
        'Only shown when a room is booked',
        'Pet meals',
        'Pet transport (pick-up and drop-off)',
        'Grooming during the stay',
        'Added to the booking total',
      ]}
    />
  );
}

export default AdditionalServices;