
"use client";

import type { User } from '@/types';
import React, { createContext, useContext, useState, useEffect, type ReactNode, useCallback, useRef } from 'react';
import { auth as firebaseAuth } from '@/lib/firebase';
import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import apiClient from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';

const CURRENT_BACKEND_USER_STORAGE_KEY = 'currentBackendUser';

interface AuthContextType {
  currentUser: User | null;
  firebaseUser: FirebaseUser | null;
  isLoadingAuth: boolean;
  backendUserId: number | null;
  setBackendUser: (user: User | null) => void;
  refetchBackendUser: () => Promise<void>;
  setPendingBackendIdForFirebaseAuth: (id: number | null) => void;
  isLoggingOut: boolean;
  setIsLoggingOut: (loggingOut: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [backendUserId, setBackendUserIdState] = useState<number | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const pendingBackendIdRef = useRef<number | null>(null);
  const [isLoggingOut, setIsLoggingOutState] = useState(false);
  const { toast } = useToast();

  const setIsLoggingOutContext = useCallback((loggingOut: boolean) => {
    console.log("AuthContext: setIsLoggingOut called with:", loggingOut);
    setIsLoggingOutState(loggingOut);
  }, []);

  const setPendingBackendIdForFirebaseAuth = useCallback((id: number | null) => {
    console.log(`AuthContext: setPendingBackendIdForFirebaseAuth called with ID: ${id}`);
    pendingBackendIdRef.current = id;
  }, []);

  const setBackendUserContext = useCallback((user: User | null) => {
    console.log("AuthContext: setBackendUserContext called with user:", user ? user.id : null);
    setCurrentUser(user);
    if (user) {
      setBackendUserIdState(user.id);
      if (typeof window !== 'undefined') window.localStorage.setItem(CURRENT_BACKEND_USER_STORAGE_KEY, JSON.stringify(user));
      console.log("AuthContext: User set in context and localStorage. currentUser ID:", user.id, "backendUserIdState:", user.id);
    } else {
      setBackendUserIdState(null);
      if (typeof window !== 'undefined') window.localStorage.removeItem(CURRENT_BACKEND_USER_STORAGE_KEY);
      console.log("AuthContext: User cleared from context and localStorage. backendUserIdState set to null.");
    }
  }, []);

  const fetchBackendUserProfile = useCallback(async (idToFetch: number, fbUserForToken: FirebaseUser) => {
    console.log(`AuthContext: Fetching backend user profile for ID: ${idToFetch} using Firebase user: ${fbUserForToken.uid}`);
    try {
      const token = await fbUserForToken.getIdToken(true);
      if (!token) {
        console.error("AuthContext: Failed to retrieve Firebase ID token. Aborting profile fetch.");
        toast({ title: "Authentication Error", description: "Could not retrieve a valid session token. Please try logging in again.", variant: "destructive" });
        setBackendUserContext(null); // Clear user state
        return;
      }

      const headersForCall = { Authorization: `Bearer ${token}` };
      const response = await apiClient.get<User>(`/users/${idToFetch}`, { headers: headersForCall });

      setBackendUserContext(response.data);
      console.log("AuthContext: Backend user profile fetched and set:", response.data.id);
    } catch (error) {
      console.error(`AuthContext: Failed to fetch backend user profile for ID ${idToFetch}:`, error);
      toast({ title: "Session Error", description: `Could not load your profile data. ${error instanceof Error ? error.message : ''}`, variant: "destructive" });
      setBackendUserContext(null); // Clear user state on error
    }
  }, [toast, setBackendUserContext]);


  useEffect(() => {
    console.log("AuthContext: Setting up onAuthStateChanged listener.");
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (fbUser) => {
      console.log(`AuthContext: --- onAuthStateChanged START --- FB User: ${fbUser?.uid}, Current pendingBackendIdRef: ${pendingBackendIdRef.current}, isLoggingOut: ${isLoggingOut}`);
      setIsLoadingAuth(true);
      console.log("AuthContext: isLoadingAuth SET TO TRUE (start of onAuthStateChanged callback)");

      if (fbUser) {
        setFirebaseUser(fbUser);
        // If an fbUser is present, it means we are not effectively "logged out" from Firebase's perspective.
        // If isLoggingOut was true, it means a logout process might be mid-way or interrupted.
        // We let `isLoggingOut` remain true if it was set, as Header will manage it.
        // If it's a new login, Header would not have set isLoggingOut.

        const idFromPendingRef = pendingBackendIdRef.current;

        if (idFromPendingRef !== null) {
          console.log(`AuthContext: Using pendingBackendIdRef: ${idFromPendingRef} to fetch profile for fbUser: ${fbUser.uid}.`);
          await fetchBackendUserProfile(idFromPendingRef, fbUser);
          pendingBackendIdRef.current = null;
          console.log("AuthContext: Cleared pendingBackendIdRef after fetch attempt.");
        } else if (currentUser?.email_id === fbUser.email && backendUserId === currentUser?.id) {
          console.log(`AuthContext: No pending ID. Backend user profile (ID: ${currentUser.id}) already loaded and consistent for fbUser: ${fbUser.uid}. CurrentUser exists and matches Firebase user.`);
        } else if (backendUserId !== null) {
          console.log(`AuthContext: No pending ID. Existing backendUserId (${backendUserId}) found. Re-fetching for newly confirmed fbUser: ${fbUser.uid}.`);
          await fetchBackendUserProfile(backendUserId, fbUser);
        } else {
          console.log(`AuthContext: Firebase user ${fbUser.uid} detected, but no backend user ID to fetch profile (no pending, no existing session backendId). currentUser is:`, currentUser);
        }
      } else {
        // User is signed out (fbUser is null)
        console.log("AuthContext: No Firebase user (logout/no session). Clearing all user states.");
        setFirebaseUser(null);
        setBackendUserContext(null); // Clears currentUser, backendUserId, and localStorage
        pendingBackendIdRef.current = null;
        setIsLoggingOutState(false); // Firebase confirms logout, so reset isLoggingOut flag
        console.log("AuthContext: isLoggingOut SET TO FALSE (Firebase user is null)");
      }
      setIsLoadingAuth(false);
      console.log(`AuthContext: --- onAuthStateChanged END --- FB User: ${fbUser?.uid}, isLoadingAuth: false`);
    });

    return () => {
      console.log("AuthContext: Unsubscribing from onAuthStateChanged.");
      unsubscribe();
    };
  }, [fetchBackendUserProfile, backendUserId, currentUser, setBackendUserContext, isLoggingOut]);


  const refetchBackendUser = async () => {
    const currentFbUser = firebaseUser;
    if (backendUserId !== null && currentFbUser) {
      console.log("AuthContext: refetchBackendUser called. Fetching profile for backendUserId:", backendUserId);
      setIsLoadingAuth(true);
      await fetchBackendUserProfile(backendUserId, currentFbUser);
      setIsLoadingAuth(false);
    } else {
      console.warn("AuthContext: refetchBackendUser called but backendUserId is null or no Firebase user.");
      if (!currentFbUser) {
         setBackendUserContext(null);
      }
      if (isLoadingAuth) setIsLoadingAuth(false);
    }
  };

  return (
    <AuthContext.Provider value={{
        currentUser,
        firebaseUser,
        isLoadingAuth,
        backendUserId,
        setBackendUser: setBackendUserContext,
        refetchBackendUser,
        setPendingBackendIdForFirebaseAuth,
        isLoggingOut,
        setIsLoggingOut: setIsLoggingOutContext
    }}>
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
