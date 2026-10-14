import DashboardShell from '../Layout/DashboardShell';

function MyPayments() {
  return (
    <DashboardShell
      title="Payments and Receipts"
      back="/account"
      items={[
        { label: 'View a sample receipt', desc: 'Preview of how a receipt will look.', to: '/receipts/sample' },
      ]}
      planned={[
        'Charges and balance for each booking',
        'Payment status: Unpaid, For Verification, Partially Paid, Paid or Refunded',
        'Upload proof of payment',
        'Open, print or save every receipt as PDF',
      ]}
    />
  );
}

export default MyPayments;