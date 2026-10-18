import { Navigate } from 'react-router-dom';
import { getUser } from '../../auth';

// Payments are already handled by two finished pages, so this address just opens the right one:
// admin -> the payments list, staff -> Bookings (record a grooming payment) / Hotel Stays (record a hotel balance).
function ManagePayments() {
  return <Navigate to={getUser()?.role === 'admin' ? '/admin/payments' : '/manage/bookings'} replace />;
}

export default ManagePayments;