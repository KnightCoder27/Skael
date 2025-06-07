
"use client";

import type { User } from '@/types';
import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { auth as firebaseAuth } from '@/lib/firebase'; // Firebase Auth instance
import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import apiClient from '@/lib/apiClient';
import { FullPageLoading } from '@/components/app/loading-spinner';

const CURRENT_BACKEND_USER_STORAGE_KEY = 'currentBackendUser';


interface AuthContextType {
  currentUser: User | null; // This will be the user profile from YOUR backend
  firebaseUser: FirebaseUser | null; // Firebase Auth user object
  isLoadingAuth: boolean;
  backendUserId: number | null; // Store backend user ID separately
  setBackendUser: (user: User | null) => void; // To update after API calls
  refetchBackendUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, _setCurrentUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [backendUserId, setBackendUserIdState] = useState<number | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    // Load backend user from local storage on initial mount
    try {
      const storedBackendUser = window.localStorage.getItem(CURRENT_BACKEND_USER_STORAGE_KEY);
      if (storedBackendUser) {
        const parsedUser = JSON.parse(storedBackendUser);
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
      setFirebaseUser(fbUser);
      if (fbUser) {
        // If Firebase user exists, try to fetch/ensure backend user profile
        // This logic might be more complex if backend user ID isn't known yet
        // For now, if currentUser is already loaded from localStorage, we assume it's synced.
        // A robust solution would fetch backend profile based on Firebase UID if currentUser is null.
        if (!currentUser && backendUserId) { // If local storage didn't have full user but had ID
            await fetchBackendUserProfile(backendUserId);
        } else if (!currentUser && !backendUserId && localStorage.getItem('pendingLoginBackendId')) {
            // Case: just logged in via API, Firebase auth state changed, now fetch full profile
            const pendingId = parseInt(localStorage.getItem('pendingLoginBackendId')!, 10);
            if (!isNaN(pendingId)) {
                await fetchBackendUserProfile(pendingId);
                localStorage.removeItem('pendingLoginBackendId');
            }
        }
      } else {
        // No Firebase user, so clear backend user data
        _setCurrentUser(null);
        setBackendUserIdState(null);
        window.localStorage.removeItem(CURRENT_BACKEND_USER_STORAGE_KEY);
      }
      setIsLoadingAuth(false);
    });

    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backendUserId]); // Rerun if backendUserId changes from an external source (e.g. login)

  const fetchBackendUserProfile = async (id: number) => {
    if (!firebaseAuth.currentUser) {
      console.warn("Tried to fetch backend user profile, but no Firebase user.");
      _setCurrentUser(null); // Ensure consistency
      setBackendUserIdState(null);
      window.localStorage.removeItem(CURRENT_BACKEND_USER_STORAGE_KEY);
      return;
    }
    setIsLoadingAuth(true); // Indicate loading while fetching
    try {
      const response = await apiClient.get<User>(`/users/${id}`);
      _setCurrentUser(response.data);
      setBackendUserIdState(response.data.id);
      window.localStorage.setItem(CURRENT_BACKEND_USER_STORAGE_KEY, JSON.stringify(response.data));
    } catch (error) {
      console.error("Failed to fetch backend user profile:", error);
      _setCurrentUser(null); // Clear if fetch fails
      setBackendUserIdState(null);
      window.localStorage.removeItem(CURRENT_BACKEND_USER_STORAGE_KEY);
      // Potentially sign out Firebase user if backend profile is critical
      // await firebaseAuth.signOut();
    } finally {
      setIsLoadingAuth(false);
    }
  };
  
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
      await fetchBackendUserProfile(backendUserId);
    } else if (firebaseUser) {
        // This case is tricky: if we have a firebaseUser but no backendUserId,
        // we might need a way to get the backendUserId from firebaseUser.uid
        // e.g., an endpoint GET /users/by-firebase-uid/{firebaseUser.uid}
        // For now, this will only work if backendUserId is already known.
        console.warn("refetchBackendUser called without backendUserId.");
    }
  };


  return (
    <AuthContext.Provider value={{ currentUser, firebaseUser, isLoadingAuth, backendUserId, setBackendUser, refetchBackendUser }}>
      {/* Removed conditional loading here to allow pages to handle their own loading states */}
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
