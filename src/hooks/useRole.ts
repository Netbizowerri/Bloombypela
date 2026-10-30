import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/auth';

export interface UseRoleReturn {
  role: UserRole;
  isAdmin: boolean;
  isStaff: boolean;
  isCustomer: boolean;
  isGuest: boolean;
  loading: boolean;
}

export function useRole(): UseRoleReturn {
  const { role, isAdmin, isStaff, isCustomer, isGuest, loading } = useAuth();
  return {
    role,
    isAdmin,
    isStaff,
    isCustomer,
    isGuest,
    loading,
  };
}
