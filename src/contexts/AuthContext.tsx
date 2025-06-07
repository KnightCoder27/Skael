
"use client";

import type { User } from '@/types';
import React, { createContext, useContext, useState, useEffect, type ReactNode, useCallback } from 'react';
import { auth as firebaseAuth } from '@/lib/firebase'; // Firebase Auth instance
import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import apiClient from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast'; // Import useToast

const CURRENT_BACKEND_USER_STORAGE_KEY = 'currentBackendUser';
const PENDING_LOGIN_BACKEND_ID_KEY = 'pendingLoginBackendId';


interface AuthContextType {
  currentUser: User | null; 
  firebaseUser: FirebaseUser | null; 
  isLoadingAuth: boolean;
  backendUserId: number | null; 
  setBackendUser: (user: User | null) => void; 
  refetchBackendUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, _setCurrentUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [backendUserId, setBackendUserIdState] = useState<number | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const { toast } = useToast(); // Initialize toast

  const fetchBackendUserProfile = useCallback(async (id: number) => {
    if (!firebaseAuth.currentUser) {
      console.warn("Attempted to fetch backend user profile, but no Firebase user is authenticated.");
      _setCurrentUser(null);
      setBackendUserIdState(null);
      window.localStorage.removeItem(CURRENT_BACKEND_USER_STORAGE_KEY);
      return;
    }
    try {
      console.log(`AuthContext: Fetching backend user profile for ID: ${id}`);
      const response = await apiClient.get<User>(`/users/${id}`); // User interface from your types
      _setCurrentUser(response.data);
      setBackendUserIdState(id); 
      window.localStorage.setItem(CURRENT_BACKEND_USER_STORAGE_KEY, JSON.stringify(response.data));
    } catch (error) {
      console.error(`AuthContext: Failed to fetch backend user profile for ID ${id}:`, error);
      _setCurrentUser(null);
      setBackendUserIdState(null);
      window.localStorage.removeItem(CURRENT_BACKEND_USER_STORAGE_KEY);
      toast({ title: "Session Error", description: "Could not load your profile. Please log in again.", variant: "destructive" });
      // Consider signing out Firebase user if backend profile is critical and fetch fails
      // await firebaseAuth.signOut(); 
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast]); // Added toast to dependency array

  useEffect(() => {
    try {
      const storedBackendUser = window.localStorage.getItem(CURRENT_BACKEND_USER_STORAGE_KEY);
      if (storedBackendUser) {
        const parsedUser: User = JSON.parse(storedBackendUser);
        _setCurrentUser(parsedUser);
        if (parsedUser && typeof parsedUser.id === 'number') {
          setBackendUserIdState(parsedUser.id);
        }
      }
    } catch (error) {
      console.warn("Error reading currentBackendUser from localStorage:", error);
      window.localStorage.removeItem(CURRENT_BACKEND_USER_STORAGE_KEY);
    }

    const unsubscribe = onAuthStateChanged(firebaseAuth, async (fbUser) => {
      setIsLoadingAuth(true);
      setFirebaseUser(fbUser);

      if (fbUser) {
        console.log("AuthContext: Firebase user detected.", fbUser.uid);
        const pendingIdStr = localStorage.getItem(PENDING_LOGIN_BACKEND_ID_KEY);
        if (pendingIdStr) {
          const pendingId = parseInt(pendingIdStr, 10);
          localStorage.removeItem(PENDING_LOGIN_BACKEND_ID_KEY); 
          if (!isNaN(pendingId)) {
            console.log(`AuthContext: pendingLoginBackendId found: ${pendingId}. Fetching profile.`);
            await fetchBackendUserProfile(pendingId);
          } else {
            console.error("AuthContext: Invalid pendingLoginBackendId found in localStorage.");
            _setCurrentUser(null);
            setBackendUserIdState(null);
            window.localStorage.removeItem(CURRENT_BACKEND_USER_STORAGE_KEY);
          }
        } else if (backendUserId && (!currentUser || currentUser.id !== backendUserId)) {
          console.log(`AuthContext: backendUserId ${backendUserId} exists, currentUser mismatched or null. Re-fetching profile.`);
          await fetchBackendUserProfile(backendUserId);
        } else if (currentUser && currentUser.id === backendUserId) {
          console.log("AuthContext: currentUser matches backendUserId from localStorage. No immediate fetch.");
        } else {
           if (!currentUser && !backendUserId) {
             console.warn("AuthContext: Firebase user session exists, but no backend user ID information available to fetch profile. User might need to complete backend login/registration linkage.");
             _setCurrentUser(null);
             setBackendUserIdState(null);
             window.localStorage.removeItem(CURRENT_BACKEND_USER_STORAGE_KEY);
           }
        }
      } else {
        console.log("AuthContext: No Firebase user detected (logout).");
        _setCurrentUser(null);
        setBackendUserIdState(null);
        window.localStorage.removeItem(CURRENT_BACKEND_USER_STORAGE_KEY);
        localStorage.removeItem(PENDING_LOGIN_BACKEND_ID_KEY); 
      }
      setIsLoadingAuth(false);
    });

    return () => {
      console.log("AuthContext: Unsubscribing from onAuthStateChanged.");
      unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchBackendUserProfile]); // fetchBackendUserProfile is now memoized with useCallback

  const setBackendUser = (user: User | null) => {
    _setCurrentUser(user);
    if (user) {
      setBackendUserIdState(user.id);
      window.localStorage.setItem(CURRENT_BACKEND_USER_STORAGE_KEY, JSON.stringify(user));
    } else {
      setBackendUserIdState(null);
      window.localStorage.removeItem(CURRENT_BACKEND_USER_STORAGE_KEY);
    }
  };

  const refetchBackendUser = async () => {
    if (backendUserId) {
      console.log("AuthContext: refetchBackendUser called. Fetching profile for backendUserId:", backendUserId);
      setIsLoadingAuth(true);
      await fetchBackendUserProfile(backendUserId);
      setIsLoadingAuth(false);
    } else {
        console.warn("AuthContext: refetchBackendUser called without a known backendUserId.");
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, firebaseUser, isLoadingAuth, backendUserId, setBackendUser, refetchBackendUser }}>
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

    