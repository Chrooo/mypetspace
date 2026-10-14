import BookingStep from './BookingStep';

function SelectSchedule() {
  return (
    <BookingStep
      step="schedule"
      title="Select Time and Date"
      planned={[
        'Grooming: date, available time slot and groomer',
        'Hotel: check-in and check-out dates (available rooms only)',
      ]}
    />
  );
}

export default SelectSchedule;