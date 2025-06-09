
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

  const setIsLoggingOut = useCallback((loggingOut: boolean) => {
    console.log("AuthContext: setIsLoggingOut called with:", loggingOut);
    setIsLoggingOutState(loggingOut);
  }, []);

  const setPendingBackendIdForFirebaseAuth = useCallback((id: number | null) => {
    console.log("AuthContext: setPendingBackendIdForFirebaseAuth called with ID:", id);
    pendingBackendIdRef.current = id;
  }, []);

  const fetchBackendUserProfile = useCallback(async (idToFetch: number, fbUserForToken: FirebaseUser) => {
    console.log(`AuthContext: Fetching backend user profile for ID: ${idToFetch} using Firebase user: ${fbUserForToken.uid}`);
    try {
      const token = await fbUserForToken.getIdToken(true);

      if (!token) {
        console.error("AuthContext: Failed to retrieve Firebase ID token for backend request. Aborting profile fetch.");
        toast({ title: "Authentication Error", description: "Could not retrieve a valid session token. Please try logging in again.", variant: "destructive" });
        setCurrentUser(null);
        setBackendUserIdState(null);
        if (typeof window !== 'undefined') window.localStorage.removeItem(CURRENT_BACKEND_USER_STORAGE_KEY);
        return;
      }
      
      const headersForCall = { Authorization: `Bearer ${token}` };
      const response = await apiClient.get<User>(`/users/${idToFetch}`, { headers: headersForCall });
      
      setCurrentUser(response.data);
      setBackendUserIdState(idToFetch);
      if (typeof window !== 'undefined') window.localStorage.setItem(CURRENT_BACKEND_USER_STORAGE_KEY, JSON.stringify(response.data));
      console.log("AuthContext: Backend user profile fetched and set:", response.data);
    } catch (error) {
      console.error(`AuthContext: Failed to fetch backend user profile for ID ${idToFetch}:`, error);
      toast({ title: "Session Error", description: `Could not load your profile data. ${error instanceof Error ? error.message : ''}`, variant: "destructive" });
      setCurrentUser(null);
      setBackendUserIdState(null);
      if (typeof window !== 'undefined') window.localStorage.removeItem(CURRENT_BACKEND_USER_STORAGE_KEY);
    }
  }, [toast]);


  useEffect(() => {
    console.log("AuthContext: Setting up onAuthStateChanged listener.");
    
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (fbUser) => {
      console.log(`AuthContext: --- onAuthStateChanged START --- FB User: ${fbUser?.uid}, Current pendingBackendIdRef: ${pendingBackendIdRef.current}, isLoggingOut: ${isLoggingOut}`);
      setIsLoadingAuth(true); // START LOADING for this auth event
      console.log("AuthContext: isLoadingAuth SET TO TRUE (start of onAuthStateChanged)");

      if (fbUser) {
        setFirebaseUser(fbUser);
        // If a Firebase user is detected, we assume any active "logging out" process should be cancelled or considered complete from this side.
        // However, setIsLoggingOut(true) should primarily be set by the component initiating logout (Header)
        // and set to false here if Firebase confirms a null user.
        // If fbUser is present, it usually means login or session persistence, not active logout.
        setIsLoggingOutState(false); 

        const idToFetchFromPendingRef = pendingBackendIdRef.current;

        if (idToFetchFromPendingRef !== null) {
          console.log(`AuthContext: Using pendingBackendIdRef: ${idToFetchFromPendingRef} to fetch profile.`);
          await fetchBackendUserProfile(idToFetchFromPendingRef, fbUser);
          pendingBackendIdRef.current = null; 
          console.log("AuthContext: Cleared pendingBackendIdRef after fetch attempt.");
        } else if (backendUserId !== null && (!currentUser || currentUser.id !== backendUserId)) {
          console.log(`AuthContext: No pending ID. Existing backendUserId (${backendUserId}) found. Re-fetching profile for fbUser: ${fbUser.uid}.`);
          await fetchBackendUserProfile(backendUserId, fbUser);
        } else if (currentUser && currentUser.id === backendUserId && backendUserId !== null) {
           console.log(`AuthContext: No pending ID. Backend user profile (ID: ${currentUser.id}) already loaded and consistent for fbUser: ${fbUser.uid}.`);
        } else {
          console.log(`AuthContext: Firebase user ${fbUser.uid} detected, but no backend user ID to fetch profile (no pending, no existing session backendId).`);
        }
      } else { // fbUser is null (logout or no session)
        console.log("AuthContext: No Firebase user (logout/no session). Clearing user state.");
        setFirebaseUser(null);
        setCurrentUser(null);
        setBackendUserIdState(null);
        pendingBackendIdRef.current = null; 
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(CURRENT_BACKEND_USER_STORAGE_KEY);
          console.log("AuthContext: Removed currentBackendUser from localStorage.");
        }
        // Crucially, set isLoggingOut to false HERE, as Firebase has confirmed the user is null.
        setIsLoggingOutState(false); 
        console.log("AuthContext: isLoggingOut SET TO FALSE (Firebase user is null)");
      }

      setIsLoadingAuth(false); 
      console.log(`AuthContext: --- onAuthStateChanged END --- FB User: ${fbUser?.uid}, isLoadingAuth: false`);
    });

    return () => {
      console.log("AuthContext: Unsubscribing from onAuthStateChanged.");
      unsubscribe();
    };
  // Primary dependencies for re-subscribing if these core functions/values change.
  // backendUserId and currentUser are added to help if their state outside this effect somehow changes and needs reconciliation,
  // though onAuthStateChanged is the main event source.
  }, [fetchBackendUserProfile, backendUserId, currentUser, isLoggingOut]); 


  const setBackendUserContext = (user: User | null) => {
    setCurrentUser(user);
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
    if (backendUserId !== null && currentFbUser) {
      console.log("AuthContext: refetchBackendUser called. Fetching profile for backendUserId:", backendUserId);
      setIsLoadingAuth(true); 
      console.log("AuthContext: isLoadingAuth SET TO TRUE (start of refetchBackendUser)");
      await fetchBackendUserProfile(backendUserId, currentFbUser);
      setIsLoadingAuth(false); 
      console.log("AuthContext: isLoadingAuth SET TO FALSE (end of refetchBackendUser)");
    } else {
      console.warn("AuthContext: refetchBackendUser called but backendUserId is null or no Firebase user is authenticated. BackendUserId:", backendUserId, "Firebase User (direct check):", currentFbUser?.uid);
      if (!currentFbUser) { 
         setCurrentUser(null);
         setBackendUserIdState(null);
         if (typeof window !== 'undefined') window.localStorage.removeItem(CURRENT_BACKEND_USER_STORAGE_KEY);
      }
       // Ensure isLoadingAuth is set to false even if refetch can't proceed
      setIsLoadingAuth(false);
      console.log("AuthContext: isLoadingAuth SET TO FALSE (refetch could not proceed or finished)");
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, firebaseUser, isLoadingAuth, backendUserId, setBackendUser: setBackendUserContext, refetchBackendUser, setPendingBackendIdForFirebaseAuth, isLoggingOut, setIsLoggingOut }}>
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

