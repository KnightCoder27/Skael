
"use client";

import type { User } from '@/types';
import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
// Import Firebase services if direct interaction is needed here,
// but typically auth state changes would trigger fetching user profile.
// For now, we'll manage a simple currentUser state.

interface AuthContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  isLoadingAuth: boolean; // To indicate if we are trying to determine auth state
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true); // Start true

  // Simulate checking auth state on mount (e.g., from Firebase Auth or a persisted session)
  // For this version, we don't have a persistent session token other than the data itself.
  // If we were using Firebase Auth, this is where onAuthStateChanged would live.
  useEffect(() => {
    // This is a placeholder. In a real Firebase Auth scenario,
    // you'd use onAuthStateChanged to set the user.
    // For now, we assume no user is logged in on initial load until login/register.
    setIsLoadingAuth(false); 
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, setCurrentUser, isLoadingAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
