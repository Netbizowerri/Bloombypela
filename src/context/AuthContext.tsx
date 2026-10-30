import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  auth, 
  isFirebaseConfigured, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  sendPasswordResetEmail, 
  fbSignOut, 
  onAuthStateChanged,
  type FirebaseUser
} from '../lib/firebase';
import { UserProfile, UserRole, AuthContextType } from '../types/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_USER_KEY = 'bloom_dev_user_profile';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<UserRole>('guest');
  const [loading, setLoading] = useState<boolean>(true);

  // Restore simulated session if in dev/preview mode without active Firebase keys
  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      try {
        const cached = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
        if (cached) {
          const parsed = JSON.parse(cached) as UserProfile;
          setUser(parsed);
          setRole(parsed.role || 'customer');
        } else {
          setUser(null);
          setRole('guest');
        }
      } catch {
        setUser(null);
        setRole('guest');
      }
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
      if (fbUser) {
        try {
          // Read custom claims from Firebase Auth token
          const tokenResult = await fbUser.getIdTokenResult();
          const tokenRole = (tokenResult.claims.role as UserRole) || 'customer';

          const profile: UserProfile = {
            uid: fbUser.uid,
            email: fbUser.email || '',
            name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Customer',
            role: tokenRole,
          };
          setUser(profile);
          setRole(tokenRole);
        } catch (e) {
          console.error('Error fetching token claims:', e);
          setUser({
            uid: fbUser.uid,
            email: fbUser.email || '',
            name: fbUser.displayName || 'Customer',
            role: 'customer',
          });
          setRole('customer');
        }
      } else {
        setUser(null);
        setRole('guest');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    try {
      if (isFirebaseConfigured && auth) {
        await signInWithEmailAndPassword(auth, email, pass);
      } else {
        // Fallback for immediate UI test & development
        const isOwner = email.toLowerCase().includes('admin') || email.toLowerCase().includes('pela');
        const simulatedProfile: UserProfile = {
          uid: 'dev-user-' + Date.now(),
          email,
          name: email.split('@')[0],
          role: isOwner ? 'admin' : 'customer',
        };
        setUser(simulatedProfile);
        setRole(simulatedProfile.role);
        localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(simulatedProfile));
      }
    } finally {
      setLoading(false);
    }
  };

  const signUpWithEmail = async (email: string, pass: string, name: string) => {
    setLoading(true);
    try {
      if (isFirebaseConfigured && auth) {
        await createUserWithEmailAndPassword(auth, email, pass);
      } else {
        const simulatedProfile: UserProfile = {
          uid: 'dev-user-' + Date.now(),
          email,
          name,
          role: 'customer',
        };
        setUser(simulatedProfile);
        setRole('customer');
        localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(simulatedProfile));
      }
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      if (isFirebaseConfigured && auth) {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
      } else {
        const simulatedProfile: UserProfile = {
          uid: 'google-user-' + Date.now(),
          email: 'customer@bloombypela.com',
          name: 'Pela Client',
          role: 'customer',
        };
        setUser(simulatedProfile);
        setRole('customer');
        localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(simulatedProfile));
      }
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    if (isFirebaseConfigured && auth) {
      await sendPasswordResetEmail(auth, email);
    } else {
      console.info(`[Demo Mode] Password reset email would be sent to: ${email}`);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      if (isFirebaseConfigured && auth) {
        await fbSignOut(auth);
      }
      setUser(null);
      setRole('guest');
      localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
    } finally {
      setLoading(false);
    }
  };

  // Helper for quick testing of RBAC (Admin, Staff, Customer) during review
  const setDevRole = (newRole: UserRole) => {
    if (newRole === 'guest') {
      setUser(null);
      setRole('guest');
      localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
      return;
    }

    const updated: UserProfile = {
      uid: user?.uid || 'dev-uid-' + newRole,
      email: user?.email || (newRole === 'admin' ? 'admin@bloombypela.com' : 'customer@bloombypela.com'),
      name: user?.name || (newRole === 'admin' ? 'Pela Admin' : newRole === 'staff' ? 'Staff Member' : 'Jane Doe'),
      role: newRole,
    };
    setUser(updated);
    setRole(newRole);
    localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(updated));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        role,
        isAdmin: role === 'admin',
        isStaff: role === 'staff' || role === 'admin',
        isCustomer: role === 'customer',
        isGuest: role === 'guest',
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        resetPassword,
        signOut,
        setDevRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
