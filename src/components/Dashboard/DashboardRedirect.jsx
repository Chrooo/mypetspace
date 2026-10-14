import { Navigate } from 'react-router-dom';
import { getUser, roleHome } from '../../auth';

// /dashboard sends each role to its own dashboard:
// admin -> /admin, staff -> /staff, groomer -> /groomer, customer (Fur Parent) -> /account
function DashboardRedirect() {
  const user = getUser();
  return <Navigate to={roleHome(user.role)} replace />;
}

export default DashboardRedirect;