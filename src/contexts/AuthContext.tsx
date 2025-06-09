
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
  setBackendUser: (user: User | null) => void; // This also sets currentUser and backendUserId
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
        setBackendUserContext(null); // Clear user state
        return;
      }
      
      const headersForCall = { Authorization: `Bearer ${token}` };
      const response = await apiClient.get<User>(`/users/${idToFetch}`, { headers: headersForCall });
      
      setBackendUserContext(response.data); // Use centralized setter
      console.log("AuthContext: Backend user profile fetched and set:", response.data);
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
        // If Header.tsx initiated logout, isLoggingOut would be true. 
        // But if fbUser is present, it means either login or session persistence, so logging out should be false.
        // However, setIsLoggingOut(false) here might conflict if a logout process is *just* starting from Header.
        // It's safer to let Header manage setting isLoggingOut to true, and this context to set it to false *only* when logout is confirmed (fbUser is null).

        const idFromPendingRef = pendingBackendIdRef.current;

        if (idFromPendingRef !== null) {
          console.log(`AuthContext: Using pendingBackendIdRef: ${idFromPendingRef} to fetch profile.`);
          await fetchBackendUserProfile(idFromPendingRef, fbUser);
          pendingBackendIdRef.current = null; 
          console.log("AuthContext: Cleared pendingBackendIdRef after fetch attempt.");
        } else if (backendUserId !== null && currentUser?.id === backendUserId) {
           console.log(`AuthContext: No pending ID. Backend user profile (ID: ${currentUser.id}) already loaded and consistent for fbUser: ${fbUser.uid}.`);
           // No fetch needed, current data is fine
        } else if (backendUserId !== null && (!currentUser || currentUser.id !== backendUserId)) {
          console.log(`AuthContext: No pending ID. Existing backendUserId (${backendUserId}) found, but current user is different or null. Re-fetching for fbUser: ${fbUser.uid}.`);
          await fetchBackendUserProfile(backendUserId, fbUser);
        } else {
          console.log(`AuthContext: Firebase user ${fbUser.uid} detected, but no backend user ID to fetch profile (no pending, no existing session backendId). currentUser is:`, currentUser);
          // This case can happen on initial load if local storage was cleared but Firebase session persists.
          // If there's no way to get backendUserId, user stays in a "Firebase-logged-in-but-no-backend-profile" state.
          // We might need a mechanism to prompt for re-sync or re-login if this state is problematic.
          // For now, we assume if there's a Firebase user but no backendUserId, they might need to complete a profile or link.
        }
      } else { 
        console.log("AuthContext: No Firebase user (logout/no session). Clearing all user states.");
        setFirebaseUser(null);
        setBackendUserContext(null); // This clears currentUser, backendUserId, and localStorage
        pendingBackendIdRef.current = null; 
        setIsLoggingOutState(false); // Logout confirmed by Firebase, so reset the flag
        console.log("AuthContext: isLoggingOut SET TO FALSE (Firebase user is null)");
      }

      setIsLoadingAuth(false); 
      console.log(`AuthContext: --- onAuthStateChanged END --- FB User: ${fbUser?.uid}, isLoadingAuth: false`);
    });

    return () => {
      console.log("AuthContext: Unsubscribing from onAuthStateChanged.");
      unsubscribe();
    };
  }, [fetchBackendUserProfile, backendUserId, currentUser, isLoggingOut, setBackendUserContext]); // Added setBackendUserContext, isLoggingOut


  const refetchBackendUser = async () => {
    const currentFbUser = firebaseUser; // Use state firebaseUser for consistency within context
    if (backendUserId !== null && currentFbUser) {
      console.log("AuthContext: refetchBackendUser called. Fetching profile for backendUserId:", backendUserId);
      setIsLoadingAuth(true); 
      console.log("AuthContext: isLoadingAuth SET TO TRUE (start of refetchBackendUser)");
      await fetchBackendUserProfile(backendUserId, currentFbUser);
      setIsLoadingAuth(false); 
      console.log("AuthContext: isLoadingAuth SET TO FALSE (end of refetchBackendUser)");
    } else {
      console.warn("AuthContext: refetchBackendUser called but backendUserId is null or no Firebase user is authenticated. BackendUserId:", backendUserId, "Firebase User (from state):", currentFbUser?.uid);
      if (!currentFbUser) { 
         setBackendUserContext(null); // Clear user if Firebase user is gone
      }
      // Ensure loading is set to false even if refetch can't proceed
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
        setIsLoggingOut 
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
