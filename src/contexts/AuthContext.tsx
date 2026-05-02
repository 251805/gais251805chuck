import React, { createContext, useContext, useState, useEffect } from 'react';
import { Role } from '../types';

interface AuthContextType {
  role: Role | null;
  setRole: (role: Role) => void;
  logout: () => void;
  hasAcceptedDisclaimer: boolean;
  setHasAcceptedDisclaimer: (val: boolean) => void;
  showDisclaimer: boolean;
  setShowDisclaimer: (val: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<Role | null>(() => {
    return (sessionStorage.getItem('gso_role') as Role) || null;
  });
  const [hasAcceptedDisclaimer, setHasAcceptedDisclaimerState] = useState<boolean>(() => {
    return sessionStorage.getItem('gso_disclaimer_accepted') === 'true';
  });
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  const setRole = (newRole: Role) => {
    setRoleState(newRole);
    sessionStorage.setItem('gso_role', newRole);
  };

  const setHasAcceptedDisclaimer = (val: boolean) => {
    setHasAcceptedDisclaimerState(val);
    sessionStorage.setItem('gso_disclaimer_accepted', val.toString());
  };

  const logout = () => {
    setRoleState(null);
    setHasAcceptedDisclaimerState(false);
    setShowDisclaimer(false);
    sessionStorage.removeItem('gso_role');
    sessionStorage.removeItem('gso_disclaimer_accepted');
  };

  return (
    <AuthContext.Provider value={{ 
      role, 
      setRole, 
      logout, 
      hasAcceptedDisclaimer, 
      setHasAcceptedDisclaimer,
      showDisclaimer,
      setShowDisclaimer
    }}>
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
