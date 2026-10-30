export type UserRole = 'guest' | 'customer' | 'staff' | 'admin';

export interface UserAddress {
  id: string;
  name: string;
  line1: string;
  line2?: string;
  city: string;
  postcode: string;
  phone: string;
  isDefault: boolean;
}

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  phone?: string;
  role: UserRole;
  addresses?: UserAddress[];
  marketingConsent?: boolean;
  stripeCustomerId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  role: UserRole;
  isAdmin: boolean;
  isStaff: boolean;
  isCustomer: boolean;
  isGuest: boolean;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  setDevRole: (role: UserRole) => void;
}
