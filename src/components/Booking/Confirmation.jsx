import BookingStep from './BookingStep';

function Confirmation() {
  return (
    <BookingStep
      step="confirmation"
      title="Confirmation of Booking"
      planned={[
        'Summary of pet, services, schedule and total',
        'Amount due now (hotel: 50% deposit, grooming: full amount)',
        'Booking starts as Pending until payment is verified',
      ]}
    />
  );
}

export default Confirmation;