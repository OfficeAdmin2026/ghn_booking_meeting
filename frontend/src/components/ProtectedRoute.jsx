import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import SiteLockedPage from './SiteLockedPage';

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, siteLock } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/" replace />;
  if (user.role === 'user' && siteLock?.locked) return <SiteLockedPage message={siteLock.message} />;

  return children;
}
