
"use client";

import type { User } from '@/types';
import React, { createContext, useContext, useState, useEffect, type ReactNode, useCallback } from 'react';
import { auth as firebaseAuth } from '@/lib/firebase'; // Firebase Auth instance
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
  setInternalPendingBackendId: (id: number | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [backendUserId, setBackendUserIdState] = useState<number | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [internalPendingBackendId, setInternalPendingBackendIdState] = useState<number | null>(null);
  const { toast } = useToast();

  const setInternalPendingBackendId = useCallback((id: number | null) => {
    console.log("AuthContext: setInternalPendingBackendId called with ID:", id);
    setInternalPendingBackendIdState(id);
  }, []);

  const fetchBackendUserProfile = useCallback(async (idToFetch: number, fbUserForToken: FirebaseUser) => {
    if (!fbUserForToken) {
      console.error("AuthContext: fetchBackendUserProfile called but fbUserForToken is null. Aborting.");
      setCurrentUser(null);
      setBackendUserIdState(null);
      if (typeof window !== 'undefined') window.localStorage.removeItem(CURRENT_BACKEND_USER_STORAGE_KEY);
      return;
    }
    console.log(`AuthContext: Fetching backend user profile for ID: ${idToFetch} using Firebase user: ${fbUserForToken.uid}`);
    try {
      const token = await fbUserForToken.getIdToken(true);

      if (!token) {
        console.error("AuthContext: Failed to retrieve Firebase ID token for backend request (token is falsy). Aborting profile fetch.");
        toast({ title: "Authentication Error", description: "Could not retrieve a valid session token. Please try logging in again.", variant: "destructive" });
        setCurrentUser(null);
        setBackendUserIdState(null);
        return;
      }
      
      console.log(`AuthContext: Retrieved Firebase ID token for GET /users/${idToFetch}. Token length: ${token.length}, Starts with: ${token.substring(0, 20)}...`);
      
      const headersForCall = {
        Authorization: `Bearer ${token}`
      };
      console.log("AuthContext: Headers for GET /users/id call:", JSON.stringify(headersForCall));

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
    console.log("AuthContext: Main useEffect running. Current state:", { isLoadingAuth, fbUserUid: firebaseUser?.uid, currentUserId: currentUser?.id, backendUserIdFromState: backendUserId, internalPendingBackendId });
    
    if (typeof window !== 'undefined' && !currentUser && !internalPendingBackendId) {
      try {
        const storedBackendUser = window.localStorage.getItem(CURRENT_BACKEND_USER_STORAGE_KEY);
        if (storedBackendUser) {
          const parsedUser: User = JSON.parse(storedBackendUser);
          setCurrentUser(parsedUser);
          if (parsedUser && typeof parsedUser.id === 'number') {
            setBackendUserIdState(parsedUser.id);
          }
          console.log("AuthContext: Initialized currentUser from localStorage:", parsedUser);
        }
      } catch (error) {
        console.warn("AuthContext: Error reading currentBackendUser from localStorage on mount:", error);
        if (typeof window !== 'undefined') window.localStorage.removeItem(CURRENT_BACKEND_USER_STORAGE_KEY);
      }
    }
    
    console.log("AuthContext: Setting up onAuthStateChanged listener.");
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (fbUser) => {
      console.log("AuthContext: onAuthStateChanged triggered. Firebase user (fbUser):", fbUser?.uid);
      setIsLoadingAuth(true); 
      
      if (fbUser) {
        setFirebaseUser(fbUser);
        console.log("AuthContext: Firebase user is present (fbUser.uid:", fbUser.uid, ")");
        
        let idToFetchProfileFor: number | null = null;
        let usedInternalPendingId = false;

        if (internalPendingBackendId !== null && !isNaN(internalPendingBackendId)) {
          console.log(`AuthContext: Using internalPendingBackendId: ${internalPendingBackendId} to fetch profile.`);
          idToFetchProfileFor = internalPendingBackendId;
          setInternalPendingBackendId(null); 
          usedInternalPendingId = true;
        } else if (backendUserId && (!currentUser || currentUser.id !== backendUserId)) {
           console.log(`AuthContext: No internal pending ID. Existing backendUserId (${backendUserId}) found. Re-fetching profile if currentUser is stale/mismatched.`);
           idToFetchProfileFor = backendUserId;
        } else if (currentUser && currentUser.id === backendUserId && backendUserId !== null) {
           console.log(`AuthContext: No internal pending ID. User profile (ID: ${currentUser.id}) already loaded and consistent with backendUserId (${backendUserId}). No immediate fetch needed.`);
        } else {
          console.log("AuthContext: Firebase user detected, but no pending ID (internal) and no clear existing backendUserId/currentUser to act upon. Current state:", { backendUserId, currentUserId: currentUser?.id });
        }

        if (idToFetchProfileFor !== null && !isNaN(idToFetchProfileFor)) {
          await fetchBackendUserProfile(idToFetchProfileFor, fbUser);
        } else {
           console.log("AuthContext: No profile fetch triggered by onAuthStateChanged internal logic this time.");
        }

      } else {
        console.log("AuthContext: No Firebase user (logout). Clearing user state.");
        setFirebaseUser(null);
        setCurrentUser(null);
        setBackendUserIdState(null);
        setInternalPendingBackendId(null); 
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(CURRENT_BACKEND_USER_STORAGE_KEY);
        }
      }
      setIsLoadingAuth(false);
      console.log("AuthContext: setIsLoadingAuth(false). Final state:", { currentUserId: currentUser?.id, fbUserId: fbUser?.uid, isLoadingAuth, internalPendingBackendId, backendUserIdFromState: backendUserId });
    });

    return () => {
      console.log("AuthContext: Unsubscribing from onAuthStateChanged.");
      unsubscribe();
    };
  }, [fetchBackendUserProfile, internalPendingBackendId, backendUserId, currentUser, isLoadingAuth]); 


  const setBackendUserContext = (user: User | null) => {
    console.log("AuthContext: setBackendUserContext (manual override) called with:", user);
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
      setIsLoadingAuth(true);
      await fetchBackendUserProfile(backendUserId, currentFbUser); 
      setIsLoadingAuth(false);
    } else {
      console.warn("AuthContext: refetchBackendUser called but backendUserId is null or no Firebase user is authenticated. BackendUserId:", backendUserId, "Firebase User:", currentFbUser);
      if (!currentFbUser) {
         setCurrentUser(null); 
         setBackendUserIdState(null);
         if (typeof window !== 'undefined') window.localStorage.removeItem(CURRENT_BACKEND_USER_STORAGE_KEY);
      }
      // setIsLoadingAuth(false); // Potentially set false here if no fetch happens
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

