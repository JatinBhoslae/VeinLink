import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PublicAuthProvider, usePublicAuth } from './context/PublicAuthContext';
import { SearchProvider } from './context/SearchContext';
import { ThemeProvider } from './context/ThemeContext';
import { MainLayout } from './components/Layout/MainLayout';
import { ChatbotWidget } from './components/Chatbot/ChatbotWidget';
import { NotificationToast } from './components/Notifications/NotificationToast';
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';

// Test environment variables
console.log('Testing environment variables:');
console.log('VITE_API_URL:', import.meta.env.VITE_API_URL);
console.log('MODE:', import.meta.env.MODE);
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Donors } from './pages/Donors';
import { BloodUnits } from './pages/BloodUnits';
import { BloodRequests } from './pages/BloodRequests';
import { InterHospitalRequests } from './pages/InterHospitalRequests';
import { BloodCamps } from './pages/BloodCamps';
import { Staff } from './pages/Staff';
import { Hospitals } from './pages/Hospitals';
import { Analytics } from './pages/Analytics';
import { UserSignup } from './pages/UserSignup';
import { UserLogin } from './pages/UserLogin';
import { UserDashboard } from './pages/UserDashboard';
import { PublicRequestBlood } from './pages/PublicRequestBlood';
import { PublicAppointments } from './pages/PublicAppointments';
import { PublicCamps } from './pages/PublicCamps';
import { UserProfile } from './pages/UserProfile';
import { DonationSlots } from './pages/DonationSlots';
import { ProfileSettings } from './pages/ProfileSettings';
import { UpdatePassword } from './pages/UpdatePassword';
import { NotificationSettings } from './pages/NotificationSettings';
import { EmergencyBroadcast } from './pages/EmergencyBroadcast';
import { EmergencyBroadcastAdmin } from './pages/EmergencyBroadcastAdmin';
import { DonorDashboard } from './pages/DonorDashboard';
import { HospitalQRScanner } from './pages/HospitalQRScanner';
import { LiveMap } from './pages/LiveMap';
import { PublicIdentity } from './pages/PublicIdentity';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return user ? children : <Navigate to="/login" replace />;
};

const PublicPrivateRoute = ({ children }) => {
  const { user, loading } = usePublicAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return user ? children : <Navigate to="/user/login" replace />;
};

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Landing />} />
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <Register />} />
      {/* Public user auth */}
      <Route path="/user/signup" element={<UserSignup />} />
      <Route path="/user/login" element={<UserLogin />} />
      <Route path="/user/emergency" element={<EmergencyBroadcast />} />
      <Route path="/live-map" element={<LiveMap />} />
      <Route path="/v-id/:id" element={<PublicIdentity />} />

      {/* Protected public user routes - Consolidated to Donor HUB */}
      <Route path="/donor-dashboard" element={<Navigate to="/user/donor-dashboard" replace />} />
      <Route path="/user/dashboard" element={<Navigate to="/user/donor-dashboard" replace />} />
      <Route path="/user/profile" element={<Navigate to="/user/donor-dashboard?tab=profile" replace />} />
      <Route path="/user/request-blood" element={<PublicPrivateRoute><PublicRequestBlood /></PublicPrivateRoute>} />
      <Route path="/user/appointments" element={<PublicPrivateRoute><PublicAppointments /></PublicPrivateRoute>} />
      <Route path="/user/camps" element={<PublicPrivateRoute><PublicCamps /></PublicPrivateRoute>} />
      <Route path="/user/donor-dashboard" element={<PublicPrivateRoute><DonorDashboard /></PublicPrivateRoute>} />
      <Route
        path="/app"
        element={
          <PrivateRoute>
            <MainLayout>
              <Navigate to="/dashboard" replace />
            </MainLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/donation-slots"
        element={
          <PrivateRoute>
            <MainLayout>
              <DonationSlots />
            </MainLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <MainLayout>
              <Dashboard />
            </MainLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/donors"
        element={
          <PrivateRoute>
            <MainLayout>
              <Donors />
            </MainLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/blood-units"
        element={
          <PrivateRoute>
            <MainLayout>
              <BloodUnits />
            </MainLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/blood-requests"
        element={
          <PrivateRoute>
            <MainLayout>
              <BloodRequests />
            </MainLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/inter-hospital-requests"
        element={
          <PrivateRoute>
            <MainLayout>
              <InterHospitalRequests />
            </MainLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/qr-scanner"
        element={
          <PrivateRoute>
            <MainLayout>
              <HospitalQRScanner />
            </MainLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/blood-camps"
        element={
          <PrivateRoute>
            <MainLayout>
              <BloodCamps />
            </MainLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/staff"
        element={
          <PrivateRoute>
            <MainLayout>
              <Staff />
            </MainLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/hospitals"
        element={
          <PrivateRoute>
            <MainLayout>
              <Hospitals />
            </MainLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/analytics"
        element={
          <PrivateRoute>
            <MainLayout>
              <Analytics />
            </MainLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/profile-settings"
        element={
          <PrivateRoute>
            <MainLayout>
              <ProfileSettings />
            </MainLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/update-password"
        element={
          <PrivateRoute>
            <MainLayout>
              <UpdatePassword />
            </MainLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/notification-settings"
        element={
          <PrivateRoute>
            <MainLayout>
              <NotificationSettings />
            </MainLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/emergency-dashboard"
        element={
          <PrivateRoute>
            <MainLayout>
              <EmergencyBroadcastAdmin />
            </MainLayout>
          </PrivateRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider>
      <SearchProvider>
        <AuthProvider>
          <PublicAuthProvider>
          <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AppRoutes />
            <ChatbotWidget />
            <NotificationToast />
            <Toaster
              position="top-right"
              toastOptions={{
                className: 'dark:bg-gray-800 dark:text-white',
              }}
            />
          </Router>
        </PublicAuthProvider>
      </AuthProvider>
      </SearchProvider>
    </ThemeProvider>
  );
}

export default App;

