import BookingStep from './BookingStep';

function Payment() {
  return (
    <BookingStep
      step="payment"
      title="Payment"
      planned={[
        'Payment method: GCash, Maya, bank transfer or pay at the shop',
        'Shop payment details and QR code',
        'Reference number and proof of payment upload',
        'Status shows For Verification until staff checks it',
      ]}
    />
  );
}

export default Payment;