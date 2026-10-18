import { Navigate } from 'react-router-dom';
import { getUser } from '../../auth';

// Groomer accounts are made and managed in Users / Register (admin); staff assign groomers on the Bookings page.
function ManageGroomers() {
  return <Navigate to={getUser()?.role === 'admin' ? '/manage/users' : '/manage/bookings'} replace />;
}

export default ManageGroomers;