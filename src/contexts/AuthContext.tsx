import React, { createContext, useContext, useState, useEffect } from 'react';
import { Role } from '../types';

interface AuthContextType {
  role: Role | null;
  setRole: (role: Role) => void;
  logout: () => void;
  acceptedTerms: boolean;
  setAcceptedTerms: (val: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<Role | null>(() => {
    return (sessionStorage.getItem('gso_role') as Role) || null;
  });
  const [acceptedTerms, setAcceptedTermsState] = useState<boolean>(() => {
    return sessionStorage.getItem('gso_terms_accepted') === 'true';
  });

  const setRole = (newRole: Role) => {
    setRoleState(newRole);
    sessionStorage.setItem('gso_role', newRole);
  };

  const setAcceptedTerms = (val: boolean) => {
    setAcceptedTermsState(val);
    sessionStorage.setItem('gso_terms_accepted', val.toString());
  };

  const logout = () => {
    setRoleState(null);
    sessionStorage.removeItem('gso_role');
  };

  return (
    <AuthContext.Provider value={{ role, setRole, logout, acceptedTerms, setAcceptedTerms }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
