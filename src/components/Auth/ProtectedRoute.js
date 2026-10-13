import { Navigate, useLocation } from 'react-router-dom';
import { Button, Result } from 'antd';
import { getUser } from '../../auth';

// <ProtectedRoute>                          -> any logged-in user
// <ProtectedRoute allowedRoles={['admin']}> -> only those roles
function ProtectedRoute({ children, allowedRoles }) {
  const location = useLocation();
  const user = getUser();

  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <Result
        status="403"
        title="You can't open this page"
        subTitle="Your account doesn't have access to this section."
        extra={<Button type="primary" href="/dashboard">Back to dashboard</Button>}
      />
    );
  }

  return children;
}

export default ProtectedRoute;