import BookingStep from './BookingStep';

function PetDetails() {
  return (
    <BookingStep
      step="pet-details"
      title="Pet Details"
      planned={[
        'Pet name, type and breed',
        'Age and size or weight',
        'Vaccination and health notes',
        'Special care instructions',
        'Owner (guest) contact details',
      ]}
    />
  );
}

export default PetDetails;