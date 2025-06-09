
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
      console.log(`AuthContext: --- onAuthStateChanged START --- FB User: ${fbUser?.uid}, Current pendingBackendIdRef: ${pendingBackendIdRef.current}, isLoggingOut: ${isLoggingOut}`);
      setIsLoadingAuth(true);
      console.log("AuthContext: isLoadingAuth SET TO TRUE (start of onAuthStateChanged callback)");

      if (fbUser) {
        setFirebaseUser(fbUser);
        // setIsLoggingOutState(false); // Reset if a user is confirmed, ensuring it's false during login/session persistence
        // console.log("AuthContext: isLoggingOut SET TO FALSE (Firebase user is present)");


        const idFromPendingRef = pendingBackendIdRef.current;

        if (idFromPendingRef !== null) {
          console.log(`AuthContext: Using pendingBackendIdRef: ${idFromPendingRef} to fetch profile for fbUser: ${fbUser.uid}.`);
          await fetchBackendUserProfile(idFromPendingRef, fbUser);
          pendingBackendIdRef.current = null;
          console.log("AuthContext: Cleared pendingBackendIdRef after fetch attempt.");
        } else if (backendUserId !== null && currentUser?.id === backendUserId && currentUser?.email_id === fbUser.email) {
           console.log(`AuthContext: No pending ID. Backend user profile (ID: ${currentUser.id}) already loaded and consistent for fbUser: ${fbUser.uid}.`);
        } else if (backendUserId !== null) {
          console.log(`AuthContext: No pending ID. Existing backendUserId (${backendUserId}) found. Re-fetching for newly confirmed fbUser: ${fbUser.uid}.`);
          await fetchBackendUserProfile(backendUserId, fbUser);
        } else {
          console.log(`AuthContext: Firebase user ${fbUser.uid} detected, but no clear path to determine backend user ID yet (no pending ID in ref, no existing session backendId). currentUser is:`, currentUser);
        }
      } else { 
        console.log("AuthContext: No Firebase user (logout/no session). Clearing all user states.");
        setFirebaseUser(null);
        setBackendUserContext(null);
        pendingBackendIdRef.current = null;
        
        setTimeout(() => {
            setIsLoggingOutState(false);
            console.log("AuthContext: isLoggingOut SET TO FALSE (delayed after Firebase user is null)");
        }, 100);
      }
      setIsLoadingAuth(false);
      console.log(`AuthContext: --- onAuthStateChanged END --- FB User: ${fbUser?.uid}, isLoadingAuth: false`);
    });

    return () => {
      console.log("AuthContext: Unsubscribing from onAuthStateChanged.");
      unsubscribe();
    };
  }, [fetchBackendUserProfile, setBackendUserContext, isLoggingOut]);


  const refetchBackendUser = async () => {
    const currentFbUser = firebaseUser;
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

