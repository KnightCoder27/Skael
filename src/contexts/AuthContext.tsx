
"use client";

import type { User } from '@/types';
import React, { createContext, useContext, useState, useEffect, type ReactNode, useCallback } from 'react';
import { auth as firebaseAuth } from '@/lib/firebase'; // Firebase Auth instance
import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import apiClient from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';

const CURRENT_BACKEND_USER_STORAGE_KEY = 'currentBackendUser';
const PENDING_LOGIN_BACKEND_ID_KEY = 'pendingLoginBackendId'; // Still used as a fallback

interface AuthContextType {
  currentUser: User | null;
  firebaseUser: FirebaseUser | null;
  isLoadingAuth: boolean;
  backendUserId: number | null;
  setBackendUser: (user: User | null) => void;
  refetchBackendUser: () => Promise<void>;
  setInternalPendingBackendId: (id: number | null) => void; // New function
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, _setCurrentUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [backendUserId, setBackendUserIdState] = useState<number | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [internalPendingBackendId, setInternalPendingBackendIdState] = useState<number | null>(null); // New state
  const { toast } = useToast();

  const setInternalPendingBackendId = useCallback((id: number | null) => {
    console.log("AuthContext: setInternalPendingBackendId called with ID:", id);
    setInternalPendingBackendIdState(id);
  }, []);

  const fetchBackendUserProfile = useCallback(async (id: number, fbUserForToken: FirebaseUser | null) => {
    if (!fbUserForToken) {
      console.warn("AuthContext: Attempted to fetch backend user profile, but no Firebase user is provided for token generation.");
      _setCurrentUser(null);
      setBackendUserIdState(null);
      if (typeof window !== 'undefined') window.localStorage.removeItem(CURRENT_BACKEND_USER_STORAGE_KEY);
      return;
    }
    console.log(`AuthContext: Fetching backend user profile for ID: ${id} using token from Firebase user: ${fbUserForToken.uid}`);
    try {
      const response = await apiClient.get<User>(`/users/${id}`);
      _setCurrentUser(response.data);
      setBackendUserIdState(id);
      if (typeof window !== 'undefined') window.localStorage.setItem(CURRENT_BACKEND_USER_STORAGE_KEY, JSON.stringify(response.data));
      console.log("AuthContext: Backend user profile fetched and set:", response.data);
    } catch (error) {
      console.error(`AuthContext: Failed to fetch backend user profile for ID ${id}:`, error);
      _setCurrentUser(null);
      setBackendUserIdState(null);
      if (typeof window !== 'undefined') window.localStorage.removeItem(CURRENT_BACKEND_USER_STORAGE_KEY);
      toast({ title: "Session Error", description: "Could not load your profile data. Please try logging in again.", variant: "destructive" });
    }
  }, [toast]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedBackendUser = window.localStorage.getItem(CURRENT_BACKEND_USER_STORAGE_KEY);
        if (storedBackendUser) {
          const parsedUser: User = JSON.parse(storedBackendUser);
          _setCurrentUser(parsedUser);
          if (parsedUser && typeof parsedUser.id === 'number') {
            setBackendUserIdState(parsedUser.id);
          }
          console.log("AuthContext: Initialized currentUser from localStorage:", parsedUser);
        }
      } catch (error) {
        console.warn("AuthContext: Error reading currentBackendUser from localStorage on mount:", error);
        window.localStorage.removeItem(CURRENT_BACKEND_USER_STORAGE_KEY);
      }
    }

    console.log("AuthContext: Setting up onAuthStateChanged listener.");
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (fbUser) => {
      console.log("AuthContext: onAuthStateChanged triggered. Firebase user (fbUser):", fbUser?.uid);
      setIsLoadingAuth(true);
      setFirebaseUser(fbUser);

      let idToFetch: number | null = null;

      if (fbUser) {
        console.log("AuthContext: Firebase user is present (fbUser.uid:", fbUser.uid, ")");

        // 1. Prioritize internal context state for pending ID
        if (internalPendingBackendId !== null) {
          console.log(`AuthContext: Using internalPendingBackendId: ${internalPendingBackendId} to fetch profile.`);
          idToFetch = internalPendingBackendId;
          setInternalPendingBackendId(null); // Clear after use
        } else {
          // 2. Fallback to localStorage for pending ID (e.g., after page refresh during auth flow)
          const pendingIdStrFromStorage = typeof window !== 'undefined' ? localStorage.getItem(PENDING_LOGIN_BACKEND_ID_KEY) : null;
          if (pendingIdStrFromStorage) {
            const parsedPendingId = parseInt(pendingIdStrFromStorage, 10);
            if (!isNaN(parsedPendingId)) {
              console.log(`AuthContext: Found pendingLoginBackendId in localStorage: ${parsedPendingId}. Using it to fetch profile.`);
              idToFetch = parsedPendingId;
            } else {
              console.error("AuthContext: Invalid pendingLoginBackendId found in localStorage (NaN).");
            }
            // Always remove from localStorage after reading, regardless of validity
            if (typeof window !== 'undefined') localStorage.removeItem(PENDING_LOGIN_BACKEND_ID_KEY);
            console.log("AuthContext: Removed pendingLoginBackendId from localStorage.");
          }
        }

        if (idToFetch !== null) {
          await fetchBackendUserProfile(idToFetch, fbUser);
        } else if (backendUserId && (!currentUser || currentUser.id !== backendUserId)) {
          console.log(`AuthContext: No pending ID. Existing backendUserId (${backendUserId}) found, currentUser might be stale or mismatched. Re-fetching profile.`);
          await fetchBackendUserProfile(backendUserId, fbUser);
        } else if (currentUser && currentUser.id === backendUserId && backendUserId !== null) {
          console.log(`AuthContext: No pending ID. User profile (ID: ${currentUser.id}) already loaded and consistent with backendUserId (${backendUserId}). No fetch needed.`);
        } else {
          console.warn("AuthContext: Firebase user detected, but no pending ID (internal or localStorage) and no clear existing backendUserId/currentUser to act upon. Current state:", { backendUserId, currentUserId: currentUser?.id });
        }
      } else {
        // No Firebase user / Logout
        console.log("AuthContext: No Firebase user (logout). Clearing user state.");
        _setCurrentUser(null);
        setBackendUserIdState(null);
        setInternalPendingBackendId(null); // Clear internal pending ID on logout
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(CURRENT_BACKEND_USER_STORAGE_KEY);
          localStorage.removeItem(PENDING_LOGIN_BACKEND_ID_KEY); // Ensure this is also cleared
        }
      }
      setIsLoadingAuth(false);
      console.log("AuthContext: setIsLoadingAuth(false). Final state:", { currentUserId: currentUser?.id, fbUserId: fbUser?.uid, isLoadingAuth: false, internalPendingBackendId, backendUserIdFromState: backendUserId });
    });

    return () => {
      console.log("AuthContext: Unsubscribing from onAuthStateChanged.");
      unsubscribe();
    };
  }, [fetchBackendUserProfile, internalPendingBackendId, backendUserId, currentUser]); // Added internalPendingBackendId and other relevant states

  const setBackendUserContext = (user: User | null) => {
    console.log("AuthContext: setBackendUserContext (manual override) called with:", user);
    _setCurrentUser(user);
    if (user) {
      setBackendUserIdState(user.id);
      if (typeof window !== 'undefined') window.localStorage.setItem(CURRENT_BACKEND_USER_STORAGE_KEY, JSON.stringify(user));
    } else {
      setBackendUserIdState(null);
      if (typeof window !== 'undefined') window.localStorage.removeItem(CURRENT_BACKEND_USER_STORAGE_KEY);
    }
  };

  const refetchBackendUser = async () => {
    const currentFbUser = firebaseAuth.currentUser;
    if (backendUserId && currentFbUser) {
      console.log("AuthContext: refetchBackendUser called. Fetching profile for backendUserId:", backendUserId);
      setIsLoadingAuth(true);
      await fetchBackendUserProfile(backendUserId, currentFbUser);
      setIsLoadingAuth(false);
    } else {
      console.warn("AuthContext: refetchBackendUser called but backendUserId is null or no Firebase user is authenticated. BackendUserId:", backendUserId, "Firebase User:", currentFbUser);
      setIsLoadingAuth(false);
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, firebaseUser, isLoadingAuth, backendUserId, setBackendUser: setBackendUserContext, refetchBackendUser, setInternalPendingBackendId }}>
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
