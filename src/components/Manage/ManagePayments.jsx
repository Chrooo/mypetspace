import DashboardShell from '../Layout/DashboardShell';

function ManagePayments() {
  return (
    <DashboardShell
      title="Payments and Receipts"
      back
      planned={[
        'All payments, filter by status',
        'Verify or reject proof of payment',
        'Record cash and walk-in payments',
        'Record refunds',
        'Open and reprint receipts; void a receipt (admin only)',
      ]}
    />
  );
}

export default ManagePayments;