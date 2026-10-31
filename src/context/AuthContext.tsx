import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  auth,
  db,
  isFirebaseConfigured,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  fbSignOut,
  onAuthStateChanged,
  type FirebaseUser,
} from '../lib/firebase';
import { updateProfile, type Auth } from 'firebase/auth';
import { doc, serverTimestamp, setDoc, type Firestore } from 'firebase/firestore';
import { UserProfile, UserRole, AuthContextType } from '../types/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const isUserRole = (value: unknown): value is UserRole =>
  value === 'guest' || value === 'customer' || value === 'staff' || value === 'admin';

const resolveRole = (claims: Record<string, unknown>): UserRole => {
  const claimRole = claims.role;
  if (claimRole === 'guest') return 'customer';
  return isUserRole(claimRole) ? claimRole : 'customer';
};

const profileFromFirebaseUser = async (
  fbUser: FirebaseUser,
  forceTokenRefresh: boolean
): Promise<UserProfile> => {
  const tokenResult = await fbUser.getIdTokenResult(forceTokenRefresh);
  return {
    uid: fbUser.uid,
    email: fbUser.email ?? '',
    name: fbUser.displayName ?? fbUser.email?.split('@')[0] ?? 'Customer',
    role: resolveRole(tokenResult.claims),
  };
};

const FirebaseConfigurationError: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#fdfbf7] px-4 py-12" role="alert">
    <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-stone-200 text-center">
      <h1 className="font-serif text-2xl font-bold text-stone-900">
        Firebase configuration required
      </h1>
      <p className="mt-3 text-xs text-stone-600 leading-relaxed">
        This application cannot start because its Firebase environment variables are missing or
        incomplete.
      </p>
      <p className="mt-3 text-xs text-stone-600 leading-relaxed">
        Add <code className="font-semibold">VITE_FIREBASE_API_KEY</code>,{' '}
        <code className="font-semibold">VITE_FIREBASE_AUTH_DOMAIN</code>,{' '}
        <code className="font-semibold">VITE_FIREBASE_PROJECT_ID</code>,{' '}
        <code className="font-semibold">VITE_FIREBASE_STORAGE_BUCKET</code>,{' '}
        <code className="font-semibold">VITE_FIREBASE_MESSAGING_SENDER_ID</code> and{' '}
        <code className="font-semibold">VITE_FIREBASE_APP_ID</code> to your local{' '}
        <code className="font-semibold">.env</code> file, then restart the development server.
      </p>
      <p className="mt-3 text-[11px] text-stone-500">
        See <code className="font-semibold">.env.example</code> for the required keys.
      </p>
    </div>
  </div>
);

interface AuthProviderInnerProps {
  children: React.ReactNode;
  authInstance: Auth;
  dbInstance: Firestore;
}

const AuthProviderInner: React.FC<AuthProviderInnerProps> = ({ children, authInstance, dbInstance }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<UserRole>('guest');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(authInstance, async (fbUser: FirebaseUser | null) => {
      if (fbUser) {
        try {
          const profile = await profileFromFirebaseUser(fbUser, false);
          setUser(profile);
          setRole(profile.role);
        } catch (err) {
          console.error('Error fetching token claims:', err);
          setUser({
            uid: fbUser.uid,
            email: fbUser.email ?? '',
            name: fbUser.displayName ?? 'Customer',
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
  }, [authInstance]);

  const signInWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const credential = await signInWithEmailAndPassword(authInstance, email, pass);
      // Force a token refresh so a newly granted custom claim is applied immediately.
      const profile = await profileFromFirebaseUser(credential.user, true);
      setUser(profile);
      setRole(profile.role);
    } finally {
      setLoading(false);
    }
  };

  const signUpWithEmail = async (email: string, pass: string, name: string) => {
    setLoading(true);
    try {
      const credential = await createUserWithEmailAndPassword(authInstance, email, pass);
      const fbUser = credential.user;

      await updateProfile(fbUser, { displayName: name });

      await setDoc(doc(dbInstance, 'customers', fbUser.uid), {
        name,
        email,
        addresses: [],
        marketingConsent: false,
        createdAt: serverTimestamp(),
      });

      const profile = await profileFromFirebaseUser(fbUser, true);
      setUser(profile);
      setRole(profile.role);
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(authInstance, provider);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(authInstance, email);
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await fbSignOut(authInstance);
      setUser(null);
      setRole('guest');
    } finally {
      setLoading(false);
    }
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (!isFirebaseConfigured || !auth || !db) {
    return <FirebaseConfigurationError />;
  }

  return (
    <AuthProviderInner authInstance={auth} dbInstance={db}>
      {children}
    </AuthProviderInner>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
