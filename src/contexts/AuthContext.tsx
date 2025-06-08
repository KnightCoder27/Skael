
"use client";

import type { User } from '@/types';
import React, { createContext, useContext, useState, useEffect, type ReactNode, useCallback } from 'react';
import { auth as firebaseAuth } from '@/lib/firebase'; // Firebase Auth instance
import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import apiClient from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';

const CURRENT_BACKEND_USER_STORAGE_KEY = 'currentBackendUser';
const PENDING_LOGIN_BACKEND_ID_KEY = 'pendingLoginBackendId';


interface AuthContextType {
  currentUser: User | null;
  firebaseUser: FirebaseUser | null;
  isLoadingAuth: boolean;
  backendUserId: number | null;
  setBackendUser: (user: User | null) => void; // This is mostly for manual overrides if ever needed, main flow is via onAuthStateChanged
  refetchBackendUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, _setCurrentUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [backendUserId, setBackendUserIdState] = useState<number | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const { toast } = useToast();

  const fetchBackendUserProfile = useCallback(async (id: number, fbUserForToken: FirebaseUser | null) => {
    if (!fbUserForToken) { // Use passed fbUserForToken for consistency
      console.warn("AuthContext: Attempted to fetch backend user profile, but no Firebase user is provided for token generation.");
      _setCurrentUser(null);
      setBackendUserIdState(null);
      if (typeof window !== 'undefined') window.localStorage.removeItem(CURRENT_BACKEND_USER_STORAGE_KEY);
      return; // Return explicitly to avoid proceeding with the fetch
    }
    console.log(`AuthContext: Fetching backend user profile for ID: ${id}`);
    try {
      // apiClient will use the current auth state to get the token
      const response = await apiClient.get<User>(`/users/${id}`);
      _setCurrentUser(response.data);
      setBackendUserIdState(id);
      if (typeof window !== 'undefined') window.localStorage.setItem(CURRENT_BACKEND_USER_STORAGE_KEY, JSON.stringify(response.data));
      console.log("AuthContext: Backend user profile fetched and set:", response.data);
    } catch (error) {
      console.error(`AuthContext: Failed to fetch backend user profile for ID ${id}:`, error);
      _setCurrentUser(null);
      setBackendUserIdState(null); // Clear backendUserId if fetch fails
      if (typeof window !== 'undefined') window.localStorage.removeItem(CURRENT_BACKEND_USER_STORAGE_KEY);
      toast({ title: "Session Error", description: "Could not load your profile data. Please try logging in again.", variant: "destructive" });
    }
  }, [toast]); // Removed firebaseUser from dependencies as it's passed directly

  useEffect(() => {
    // Load initial state from localStorage if available
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
      setIsLoadingAuth(true); // Set loading true at the start of handling auth state change
      setFirebaseUser(fbUser);

      if (fbUser) {
        console.log("AuthContext: Firebase user is present (fbUser.uid:", fbUser.uid, ")");
        const pendingIdStr = typeof window !== 'undefined' ? localStorage.getItem(PENDING_LOGIN_BACKEND_ID_KEY) : null;
        
        if (pendingIdStr) {
          const pendingId = parseInt(pendingIdStr, 10);
          console.log(`AuthContext: Found pendingLoginBackendId: ${pendingIdStr}. Attempting to parse.`);
          // IMPORTANT: Remove the pending ID immediately after reading it to prevent reprocessing
          if (typeof window !== 'undefined') localStorage.removeItem(PENDING_LOGIN_BACKEND_ID_KEY);
          
          if (!isNaN(pendingId)) {
            console.log(`AuthContext: Parsed pendingLoginBackendId: ${pendingId}. Fetching profile.`);
            await fetchBackendUserProfile(pendingId, fbUser);
          } else {
            console.error("AuthContext: Invalid pendingLoginBackendId found (NaN). Clearing user state.");
            _setCurrentUser(null);
            setBackendUserIdState(null);
            if (typeof window !== 'undefined') window.localStorage.removeItem(CURRENT_BACKEND_USER_STORAGE_KEY);
          }
        } else if (backendUserId && (!currentUser || currentUser.id !== backendUserId)) {
          // This condition handles cases where a backendUserId exists from a previous session (e.g. from localStorage on init)
          // but the currentUser in memory is stale or doesn't match.
          console.log(`AuthContext: No pendingLoginBackendId. Existing backendUserId (${backendUserId}) present. CurrentUser ID is ${currentUser?.id}. Re-fetching profile.`);
          await fetchBackendUserProfile(backendUserId, fbUser);
        } else if (currentUser && currentUser.id === backendUserId && backendUserId !== null) {
          console.log(`AuthContext: No pendingLoginBackendId. User profile (ID: ${currentUser.id}) already loaded and consistent with backendUserId (${backendUserId}). No fetch needed.`);
        } else {
            console.warn("AuthContext: Firebase user detected, but no pendingLoginBackendId and no clear existing backendUserId/currentUser to act upon. Current state:", { backendUserId, currentUserId: currentUser?.id });
            // If here, it means fbUser exists, but we don't have a backend ID to fetch. This might happen if localStorage was cleared
            // but Firebase still has a session. In this case, the user might need to "re-login" through the app's flow
            // to establish the link to the backend ID.
            // We do not clear currentUser here if it was loaded from localStorage init, to avoid flicker if context re-renders.
        }
      } else {
        // No Firebase user / Logout
        console.log("AuthContext: No Firebase user (logout). Clearing user state.");
        _setCurrentUser(null);
        setBackendUserIdState(null);
        if (typeof window !== 'undefined') {
            window.localStorage.removeItem(CURRENT_BACKEND_USER_STORAGE_KEY);
            // Ensure pendingLoginBackendId is also cleared on logout, though it should have been consumed.
            localStorage.removeItem(PENDING_LOGIN_BACKEND_ID_KEY); 
        }
      }
      setIsLoadingAuth(false);
      console.log("AuthContext: setIsLoadingAuth(false). Final state:", { currentUserId: currentUser?.id, fbUserId: fbUser?.uid, isLoading: false });
    });

    return () => {
      console.log("AuthContext: Unsubscribing from onAuthStateChanged.");
      unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchBackendUserProfile]); // Only fetchBackendUserProfile, as others are state setters or derived

  const setBackendUser = (user: User | null) => {
    console.log("AuthContext: setBackendUser called with:", user);
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
    const currentFbUser = firebaseAuth.currentUser; // Get the most current Firebase user
    if (backendUserId && currentFbUser) {
      console.log("AuthContext: refetchBackendUser called. Fetching profile for backendUserId:", backendUserId);
      setIsLoadingAuth(true);
      await fetchBackendUserProfile(backendUserId, currentFbUser);
      setIsLoadingAuth(false);
    } else {
        console.warn("AuthContext: refetchBackendUser called but backendUserId is null or no Firebase user is authenticated. BackendUserId:", backendUserId, "Firebase User:", currentFbUser);
        // If no backendUserId, we can't refetch. If no firebaseUser, apiClient won't have token.
        // Setting isLoadingAuth to false as no fetch will occur.
        setIsLoadingAuth(false);
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

