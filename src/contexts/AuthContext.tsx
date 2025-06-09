
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
  setPendingBackendIdForFirebaseAuth: (id: number | null) => void; // Changed from setInternalPendingBackendId
  isLoggingOut: boolean;
  setIsLoggingOut: (loggingOut: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [backendUserId, setBackendUserIdState] = useState<number | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const pendingBackendIdRef = useRef<number | null>(null); // Using a ref
  const [authResolutionAttempted, setAuthResolutionAttempted] = useState(false);
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
        console.error("AuthContext: Failed to retrieve Firebase ID token for backend request (token is falsy). Aborting profile fetch.");
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
    console.log("AuthContext: Main useEffect running. Current state:", { isLoadingAuth, fbUserUid: firebaseUser?.uid, currentUserId: currentUser?.id, backendUserIdFromState: backendUserId, pendingBackendIdFromRef: pendingBackendIdRef.current, isLoggingOut });
    
    if (typeof window !== 'undefined' && !currentUser && pendingBackendIdRef.current === null && !isLoggingOut) {
      try {
        const storedBackendUser = window.localStorage.getItem(CURRENT_BACKEND_USER_STORAGE_KEY);
        if (storedBackendUser) {
          const parsedUser: User = JSON.parse(storedBackendUser);
          setCurrentUser(parsedUser);
          if (parsedUser && typeof parsedUser.id === 'number') {
            setBackendUserIdState(parsedUser.id);
          }
        }
      } catch (error) {
        console.warn("AuthContext: Error reading currentBackendUser from localStorage on mount:", error);
        if (typeof window !== 'undefined') window.localStorage.removeItem(CURRENT_BACKEND_USER_STORAGE_KEY);
      }
    }
    
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (fbUser) => {
      console.log("AuthContext: onAuthStateChanged triggered. Firebase user (fbUser):", fbUser?.uid, "Current pendingBackendIdRef:", pendingBackendIdRef.current);
      setAuthResolutionAttempted(false); // Reset resolution attempt for each auth state change

      if (fbUser) {
        setFirebaseUser(fbUser);
        console.log("AuthContext: Firebase user is present (fbUser.uid:", fbUser.uid, ")");
        
        let idToFetchProfileFor: number | null = null;
        const localPendingId = pendingBackendIdRef.current; 

        if (localPendingId !== null && !isNaN(localPendingId)) {
          console.log(`AuthContext: Using localPendingId from ref: ${localPendingId} to fetch profile.`);
          idToFetchProfileFor = localPendingId;
          pendingBackendIdRef.current = null; // Clear the ref after reading it for use
        } else if (backendUserId && (!currentUser || currentUser.id !== backendUserId)) {
           console.log(`AuthContext: No pending ID in ref. Existing backendUserId (${backendUserId}) found. Re-fetching profile if currentUser is stale/mismatched.`);
           idToFetchProfileFor = backendUserId;
        } else if (currentUser && currentUser.id === backendUserId && backendUserId !== null) {
           console.log(`AuthContext: No pending ID in ref. User profile (ID: ${currentUser.id}) already loaded and consistent with backendUserId (${backendUserId}). No immediate fetch needed.`);
        } else {
          console.log("AuthContext: Firebase user detected, but no clear path to determine backend user ID yet (no pending ID in ref, no existing session to refresh/resume).");
        }

        if (idToFetchProfileFor !== null && !isNaN(idToFetchProfileFor)) {
          await fetchBackendUserProfile(idToFetchProfileFor, fbUser);
        }
        setIsLoggingOutState(false); // Ensure isLoggingOut is false if we have a Firebase user
        setAuthResolutionAttempted(true); // Mark resolution as attempted after processing fbUser

      } else { // fbUser is null (logout)
        console.log("AuthContext: No Firebase user (logout). Clearing user state.");
        setFirebaseUser(null);
        setCurrentUser(null);
        setBackendUserIdState(null);
        pendingBackendIdRef.current = null; // Clear ref on logout
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(CURRENT_BACKEND_USER_STORAGE_KEY);
        }
        setAuthResolutionAttempted(true); 
        setIsLoggingOutState(false); // This should be after other state clearings and authResolution
      }
      console.log("AuthContext: onAuthStateChanged processing finished for this event.");
    });

    return () => {
      console.log("AuthContext: Unsubscribing from onAuthStateChanged.");
      unsubscribe();
    };
  }, [fetchBackendUserProfile, backendUserId, currentUser]); 


  useEffect(() => {
    if (authResolutionAttempted) {
      setIsLoadingAuth(false);
      console.log("AuthContext: authResolutionAttempted is true, setting isLoadingAuth to false. Final states:", { currentUserId: currentUser?.id, fbUserUid: firebaseUser?.uid, backendUserId, isLoggingOut });
    } else {
      setIsLoadingAuth(true);
       console.log("AuthContext: authResolutionAttempted is false (or other deps changed), setting isLoadingAuth to true.");
    }
  }, [authResolutionAttempted, currentUser, firebaseUser, backendUserId, isLoggingOut]);


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
    if (backendUserId && currentFbUser) {
      console.log("AuthContext: refetchBackendUser called. Fetching profile for backendUserId:", backendUserId);
      setIsLoadingAuth(true); // Indicate loading during refetch
      setAuthResolutionAttempted(false);
      await fetchBackendUserProfile(backendUserId, currentFbUser);
      setAuthResolutionAttempted(true); // This will trigger isLoadingAuth to false
    } else {
      console.warn("AuthContext: refetchBackendUser called but backendUserId is null or no Firebase user is authenticated. BackendUserId:", backendUserId, "Firebase User:", currentFbUser);
      if (!currentFbUser) {
         setCurrentUser(null);
         setBackendUserIdState(null);
         if (typeof window !== 'undefined') window.localStorage.removeItem(CURRENT_BACKEND_USER_STORAGE_KEY);
         setAuthResolutionAttempted(true); // Ensure isLoadingAuth becomes false
      }
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

