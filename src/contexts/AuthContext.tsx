
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
    console.log("AuthContext: setIsLoggingOutContext called with:", loggingOut);
    setIsLoggingOutState(loggingOut);
  }, []);

  const setPendingBackendIdForFirebaseAuth = useCallback((id: number | null) => {
    console.log(`AuthContext: setPendingBackendIdForFirebaseAuth called with ID: ${id}`);
    pendingBackendIdRef.current = id;
  }, []);

  const setBackendUserContext = useCallback((user: User | null) => {
    console.log("AuthContext: setBackendUserContext called with user:", user);
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
        setBackendUserContext(null);
        return;
      }

      const headersForCall = { Authorization: `Bearer ${token}` };
      const response = await apiClient.get<User>(`/users/${idToFetch}`, { headers: headersForCall });

      setBackendUserContext(response.data);
      console.log("AuthContext: Backend user profile fetched and set:", response.data);
    } catch (error) {
      console.error(`AuthContext: Failed to fetch backend user profile for ID ${idToFetch}:`, error);
      toast({ title: "Session Error", description: `Could not load your profile data. ${error instanceof Error ? error.message : ''}`, variant: "destructive" });
      setBackendUserContext(null);
    }
  }, [toast, setBackendUserContext]);


  useEffect(() => {
    console.log("AuthContext: Setting up onAuthStateChanged listener.");
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (fbUser) => {
      console.log(`AuthContext: --- onAuthStateChanged START --- FB User: ${fbUser?.uid}, Current pendingBackendIdRef: ${pendingBackendIdRef.current}, isLoggingOut (from context state): ${isLoggingOut}`);
      setIsLoadingAuth(true);
      console.log("AuthContext: isLoadingAuth SET TO TRUE (start of onAuthStateChanged callback)");

      if (fbUser) {
        setFirebaseUser(fbUser);
        // If a Firebase user is detected, it implies we are not in the middle of a user-initiated logout process
        // that is still waiting to navigate. Or, if we are, this fbUser means the logout didn't fully complete on Firebase's side,
        // or it's a new login. In either case, if a user is present, 'isLoggingOut' should be false.
        // However, setIsLoggingOut is now primarily managed by Header.tsx for initiating logout.
        // We might still want to ensure it's false if a user session is confirmed here and `isLoggingOut` was somehow true.
        if (isLoggingOut) { // If context still thinks we are logging out but Firebase provides a user
          console.log("AuthContext: Firebase user present, but isLoggingOut was true. Setting to false.");
          setIsLoggingOutState(false);
        }


        const idFromPendingRef = pendingBackendIdRef.current;

        if (idFromPendingRef !== null) {
          console.log(`AuthContext: Using pendingBackendIdRef: ${idFromPendingRef} to fetch profile for fbUser: ${fbUser.uid}.`);
          await fetchBackendUserProfile(idFromPendingRef, fbUser);
          pendingBackendIdRef.current = null;
          console.log("AuthContext: Cleared pendingBackendIdRef after fetch attempt.");
        } else if (currentUser?.email_id === fbUser.email && backendUserId === currentUser?.id) {
           console.log(`AuthContext: No pending ID. Backend user profile (ID: ${currentUser.id}) already loaded and consistent for fbUser: ${fbUser.uid}.`);
        } else if (backendUserId !== null) {
          console.log(`AuthContext: No pending ID. Existing backendUserId (${backendUserId}) found. Re-fetching for newly confirmed fbUser: ${fbUser.uid}.`);
          await fetchBackendUserProfile(backendUserId, fbUser);
        } else {
          console.log(`AuthContext: Firebase user ${fbUser.uid} detected, but no clear path to determine backend user ID yet.`);
        }
      } else {
        // User is signed out
        console.log("AuthContext: No Firebase user (logout/no session). Clearing Firebase user and related state.");
        setFirebaseUser(null);
        setBackendUserContext(null); // This clears currentUser, backendUserId, and localStorage
        pendingBackendIdRef.current = null;
        // Header.tsx is now responsible for setting isLoggingOut to false *after* navigation.
        // AuthContext does not reset isLoggingOut here to allow guarded pages to see it as true during the transition.
        console.log("AuthContext: User states cleared. isLoggingOut flag is not changed here.");
      }
      setIsLoadingAuth(false);
      console.log(`AuthContext: --- onAuthStateChanged END --- FB User: ${fbUser?.uid}, isLoadingAuth: false`);
    });

    return () => {
      console.log("AuthContext: Unsubscribing from onAuthStateChanged.");
      unsubscribe();
    };
  // Dependencies: fetchBackendUserProfile and functions from useState/useRef are stable.
  // backendUserId, currentUser, and isLoggingOut are states that, if changed from outside this effect,
  // might warrant a re-evaluation or re-subscription, though onAuthStateChanged itself is the main event source.
  }, [fetchBackendUserProfile, backendUserId, currentUser, isLoggingOut, setBackendUserContext]);


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
