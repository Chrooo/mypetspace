import { Link, useParams } from 'react-router-dom';
import PageShell from '../Layout/PageShell';

// Opened from the payment page, from My Payments, and from Payments and Receipts (staff/admin).
function Receipt() {
  const { id } = useParams();

  return (
    <PageShell
      title="Receipt"
      subtitle={`Receipt: ${id}`}
      planned={[
        'Receipt number (like MPS-2026-000001), date and time',
        'Customer, pet and booking reference',
        'Items: services or room nights with price',
        'Total, amount paid in this receipt and remaining balance',
        'Payment method and reference number',
        'Verified by (staff name) and shop details',
      ]}
    >
      <div className="page-actions" style={{ marginTop: 0, marginBottom: 28 }}>
        <button type="button" className="btn btn-pink" onClick={() => window.print()}>
          Print / Save as PDF
        </button>
        <Link to="/dashboard" className="btn btn-outline-teal">Back to dashboard</Link>
      </div>
    </PageShell>
  );
}

export default Receipt;