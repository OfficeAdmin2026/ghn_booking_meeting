import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import LoginPage from './pages/LoginPage';
import CalendarPage from './pages/CalendarPage';
import OfficeMapPage from './pages/OfficeMapPage';
import DashboardPage from './pages/DashboardPage';
import AdminPage from './pages/AdminPage';
import AnalyticsPage from './pages/AnalyticsPage';
import RulesPage from './pages/RulesPage';

function Layout({ children, fullHeight }) {
  return (
    <div className={fullHeight ? 'h-screen flex flex-col overflow-hidden' : 'min-h-screen bg-gray-50'}>
      <Navbar />
      <main className={fullHeight ? 'flex-1 overflow-hidden' : ''}>{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={
            <ProtectedRoute>
              <Layout fullHeight><CalendarPage /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/office-map" element={
            <ProtectedRoute>
              <Layout fullHeight><OfficeMapPage /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/dashboard" element={
            <ProtectedRoute adminOnly>
              <Layout><DashboardPage /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin" element={
            <ProtectedRoute adminOnly>
              <Layout><AdminPage /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/analytics" element={
            <ProtectedRoute adminOnly>
              <Layout><AnalyticsPage /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/rules" element={
            <ProtectedRoute>
              <Layout><RulesPage /></Layout>
            </ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
