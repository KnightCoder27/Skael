
"use client";

import type { User } from '@/types';
import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

const USER_STORAGE_KEY = 'currentUser';

interface AuthContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  isLoadingAuth: boolean; 
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, _setCurrentUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    try {
      const storedUser = window.localStorage.getItem(USER_STORAGE_KEY);
      if (storedUser) {
        _setCurrentUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.warn("Error reading currentUser from localStorage:", error);
      window.localStorage.removeItem(USER_STORAGE_KEY); // Clear corrupted data
    }
    setIsLoadingAuth(false);
  }, []);

  const setCurrentUser = (user: User | null) => {
    _setCurrentUser(user);
    if (user) {
      try {
        window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
      } catch (error) {
        console.warn("Error saving currentUser to localStorage:", error);
      }
    } else {
      try {
        window.localStorage.removeItem(USER_STORAGE_KEY);
      } catch (error) {
        console.warn("Error removing currentUser from localStorage:", error);
      }
    }
  };

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
