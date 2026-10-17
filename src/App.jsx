import { Navigate, Outlet, Route, Routes } from 'react-router-dom';

import Landing from './components/Landing/Landing';
import Login from './components/Auth/Login';
import SignUp from './components/Auth/SignUp';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import DashboardRedirect from './components/Dashboard/DashboardRedirect';

// public pages
import AboutUs from './components/Public/AboutUs';
import Services from './components/Public/Services';
import Rooms from './components/Public/Rooms';
import TermsAndConditions from './components/Public/TermsAndConditions';


// security (two-factor authentication)
import Security from './components/Security/Security';

// booking steps and receipt
import PetDetails from './components/Booking/PetDetails';
import SelectServices from './components/Booking/SelectServices';
import AdditionalServices from './components/Booking/AdditionalServices';
import SelectSchedule from './components/Booking/SelectSchedule';
import Confirmation from './components/Booking/Confirmation';
import Payment from './components/Booking/Payment';
import Receipt from './components/Receipt/Receipt';

// Fur Parent (customer)
import CustomerDashboard from './components/Customer/CustomerDashboard';
import Profile from './components/Customer/Profile';
import MyReservations from './components/Customer/MyReservations';
import MyAppointments from './components/Customer/MyAppointments';
import MyPets from './components/Customer/MyPets';
import MyPayments from './components/Customer/MyPayments'
import MyBookings from './components/Customer/MyBookings';;

// groomer
import GroomerDashboard from './components/Groomer/GroomerDashboard';
import GroomerProfile from './components/Groomer/GroomerProfile';
import GroomerAvailability from './components/Groomer/GroomerAvailability';
import AssignedServices from './components/Groomer/AssignedServices';

// admin, staff and the pages they share
import AdminDashboard from './components/Admin/AdminDashboard';
import AuditLogs from './components/Admin/AuditLogs';
import AdminPayments from './components/Admin/AdminPayments';
import AdminRegister from './components/Admin/AdminRegister';
import StaffDashboard from './components/Staff/StaffDashboard';
import ManageReservations from './components/Manage/ManageReservations';
import ManageRooms from './components/Manage/ManageRooms';
import ManageAppointments from './components/Manage/ManageAppointments';
import ManageServices from './components/Manage/ManageServices';
import ManageGroomers from './components/Manage/ManageGroomers';
import ManagePayments from './components/Manage/ManagePayments';
import ManageUsers from './components/Manage/ManageUsers';

// <Route element={guard([...roles])}> ... </Route>  -> every page inside needs one of those roles
const guard = (roles) => (
  <ProtectedRoute allowedRoles={roles}>
    <Outlet />
  </ProtectedRoute>
);

function App() {
  return (
    <Routes>
      {/* ---------- public ---------- */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<SignUp />} />

      <Route path="/about" element={<AboutUs />} />
      <Route path="/services" element={<Services />} />
      <Route path="/terms" element={<TermsAndConditions />} />
      <Route path="/rooms" element={<Rooms />} />

      {/* ---------- any logged-in user: sends each role to its own dashboard ---------- */}
      <Route path="/dashboard" element={<ProtectedRoute><DashboardRedirect /></ProtectedRoute>} />

      {/* ---------- security settings: every logged-in role ---------- */}
      <Route element={guard(['customer', 'groomer', 'staff', 'admin'])}>
        <Route path="/security" element={<Security />} />
      </Route>

      {/* ---------- booking (type is "grooming" or "room") ---------- */}
      <Route element={guard(['customer', 'staff', 'admin'])}>
        <Route path="/book/:type" element={<Navigate to="pet-details" replace />} />
        <Route path="/book/:type/pet-details" element={<PetDetails />} />
        <Route path="/book/:type/services" element={<SelectServices />} />
        <Route path="/book/:type/additional-services" element={<AdditionalServices />} />
        <Route path="/book/:type/schedule" element={<SelectSchedule />} />
        <Route path="/book/:type/confirmation" element={<Confirmation />} />
        <Route path="/book/:type/payment" element={<Payment />} />
        <Route path="/receipts/:id" element={<Receipt />} />
      </Route>

      {/* ---------- Fur Parent (customer) ---------- */}
      <Route element={guard(['customer'])}>
        <Route path="/account" element={<CustomerDashboard />} />
        <Route path="/account/profile" element={<Profile />} />
        <Route path="/account/reservations" element={<MyReservations />} />
        <Route path="/account/appointments" element={<MyAppointments />} />
        <Route path="/account/pets" element={<MyPets />} />
        <Route path="/account/payments" element={<MyPayments />} />
      </Route>

      {/* ---------- groomer ---------- */}
      <Route element={guard(['groomer'])}>
        <Route path="/groomer" element={<GroomerDashboard />} />
        <Route path="/groomer/profile" element={<GroomerProfile />} />
        <Route path="/groomer/availability" element={<GroomerAvailability />} />
        <Route path="/groomer/assignments" element={<AssignedServices />} />
      </Route>

      {/* ---------- admin and staff ---------- */}
      <Route element={guard(['admin'])}>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/manage/users" element={<ManageUsers />} />
        <Route path="/admin/audit-logs" element={<AuditLogs />} />
        <Route path="/admin/payments" element={<AdminPayments />} />
        <Route path="/admin/register" element={<AdminRegister />} />
      </Route>
      <Route element={guard(['staff'])}>
        <Route path="/staff" element={<StaffDashboard />} />
      </Route>
      <Route element={guard(['admin', 'staff'])}>
        <Route path="/manage/reservations" element={<ManageReservations />} />
        <Route path="/manage/rooms" element={<ManageRooms />} />
        <Route path="/manage/appointments" element={<ManageAppointments />} />
        <Route path="/manage/services" element={<ManageServices />} />
        <Route path="/manage/groomers" element={<ManageGroomers />} />
        <Route path="/manage/payments" element={<ManagePayments />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;