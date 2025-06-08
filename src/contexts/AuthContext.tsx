
"use client";

import type { User } from '@/types';
import React, { createContext, useContext, useState, useEffect, type ReactNode, useCallback } from 'react';
import { auth as firebaseAuth } from '@/lib/firebase'; // Firebase Auth instance
import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import apiClient from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';

const CURRENT_BACKEND_USER_STORAGE_KEY = 'currentBackendUser';
const PENDING_LOGIN_BACKEND_ID_KEY = 'pendingLoginBackendId'; // Still used for cleanup

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
  const [_currentUser, _setCurrentUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [_backendUserId, _setBackendUserIdState] = useState<number | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [internalPendingBackendId, setInternalPendingBackendIdState] = useState<number | null>(null);
  const { toast } = useToast();

  const setInternalPendingBackendId = useCallback((id: number | null) => {
    console.log("AuthContext: setInternalPendingBackendId called with ID:", id);
    setInternalPendingBackendIdState(id);
  }, []);

  const fetchBackendUserProfile = useCallback(async (id: number, fbUserForToken: FirebaseUser | null) => {
    if (!fbUserForToken) {
      console.warn("AuthContext: Attempted to fetch backend user profile, but no Firebase user is provided for token generation.");
      _setCurrentUser(null);
      _setBackendUserIdState(null);
      if (typeof window !== 'undefined') window.localStorage.removeItem(CURRENT_BACKEND_USER_STORAGE_KEY);
      return;
    }
    console.log(`AuthContext: Fetching backend user profile for ID: ${id} using Firebase user: ${fbUserForToken.uid}`);
    try {
      const token = await fbUserForToken.getIdToken(true); // true to force refresh
      if (!token) {
        console.error("AuthContext: Failed to retrieve Firebase ID token for backend request.");
        throw new Error("Failed to retrieve Firebase ID token.");
      }
      console.log(`AuthContext: Retrieved Firebase ID token for backend request (first 10 chars): ${token.substring(0,10)}...`);
      
      const response = await apiClient.get<User>(`/users/${id}`, {
        headers: {
          Authorization: `Bearer ${token}` // Explicitly pass the token
        }
      });
      _setCurrentUser(response.data);
      _setBackendUserIdState(id);
      if (typeof window !== 'undefined') window.localStorage.setItem(CURRENT_BACKEND_USER_STORAGE_KEY, JSON.stringify(response.data));
      console.log("AuthContext: Backend user profile fetched and set:", response.data);
    } catch (error) {
      console.error(`AuthContext: Failed to fetch backend user profile for ID ${id}:`, error);
      _setCurrentUser(null);
      _setBackendUserIdState(null); 
      if (typeof window !== 'undefined') window.localStorage.removeItem(CURRENT_BACKEND_USER_STORAGE_KEY);
      toast({ title: "Session Error", description: `Could not load your profile data. ${error instanceof Error ? error.message : ''}`, variant: "destructive" });
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
            _setBackendUserIdState(parsedUser.id);
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
      setFirebaseUser(fbUser);

      if (fbUser) {
        console.log("AuthContext: Firebase user is present (fbUser.uid:", fbUser.uid, ")");
        let idToFetch: number | null = null;

        if (internalPendingBackendId !== null) {
          console.log(`AuthContext: Using internalPendingBackendId: ${internalPendingBackendId} to fetch profile.`);
          idToFetch = internalPendingBackendId;
          setInternalPendingBackendId(null); // Clear after use
        } else {
           // Fallback check for localStorage if internalPendingBackendId is not set
           // This handles cases like page refresh when Firebase session exists but context state is reset.
           const pendingIdFromStorage = typeof window !== 'undefined' ? window.localStorage.getItem(PENDING_LOGIN_BACKEND_ID_KEY) : null;
           if (pendingIdFromStorage) {
               console.log(`AuthContext: Found pendingLoginBackendId in localStorage: ${pendingIdFromStorage}. Using it.`);
               idToFetch = parseInt(pendingIdFromStorage, 10);
               if (typeof window !== 'undefined') window.localStorage.removeItem(PENDING_LOGIN_BACKEND_ID_KEY); // Clean up
           }
        }
        
        // Cleanup any lingering PENDING_LOGIN_BACKEND_ID_KEY, even if not used above
        if (typeof window !== 'undefined' && window.localStorage.getItem(PENDING_LOGIN_BACKEND_ID_KEY)) {
            console.log("AuthContext: Cleaning up lingering PENDING_LOGIN_BACKEND_ID_KEY from localStorage.");
            window.localStorage.removeItem(PENDING_LOGIN_BACKEND_ID_KEY);
        }

        if (idToFetch !== null && !isNaN(idToFetch)) {
          await fetchBackendUserProfile(idToFetch, fbUser);
        } else if (_backendUserId && (!_currentUser || _currentUser.id !== _backendUserId)) {
          console.log(`AuthContext: No pending ID. Existing backendUserId (${_backendUserId}) found from state/localStorage. Re-fetching profile if currentUser is stale/mismatched.`);
          await fetchBackendUserProfile(_backendUserId, fbUser);
        } else if (_currentUser && _currentUser.id === _backendUserId && _backendUserId !== null) {
          console.log(`AuthContext: No pending ID. User profile (ID: ${_currentUser.id}) already loaded and consistent with backendUserId (${_backendUserId}). No fetch needed.`);
        } else {
          console.warn("AuthContext: Firebase user detected, but no pending ID (internal or localStorage) and no clear existing backendUserId/currentUser to act upon. Current state:", { backendUserId: _backendUserId, currentUserId: _currentUser?.id });
        }
      } else {
        console.log("AuthContext: No Firebase user (logout). Clearing user state.");
        _setCurrentUser(null);
        _setBackendUserIdState(null);
        setInternalPendingBackendId(null);
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(CURRENT_BACKEND_USER_STORAGE_KEY);
          window.localStorage.removeItem(PENDING_LOGIN_BACKEND_ID_KEY); // Ensure cleanup on logout
        }
      }
      setIsLoadingAuth(false);
      console.log("AuthContext: setIsLoadingAuth(false). Final state:", { currentUserId: _currentUser?.id, fbUserId: fbUser?.uid, isLoadingAuth, internalPendingBackendId, backendUserIdFromState: _backendUserId });
    });

    return () => {
      console.log("AuthContext: Unsubscribing from onAuthStateChanged.");
      unsubscribe();
    };
  }, [fetchBackendUserProfile, internalPendingBackendId, _backendUserId, _currentUser]);


  const setBackendUserContext = (user: User | null) => {
    console.log("AuthContext: setBackendUserContext (manual override) called with:", user);
    _setCurrentUser(user);
    if (user) {
      _setBackendUserIdState(user.id);
      if (typeof window !== 'undefined') window.localStorage.setItem(CURRENT_BACKEND_USER_STORAGE_KEY, JSON.stringify(user));
    } else {
      _setBackendUserIdState(null);
      if (typeof window !== 'undefined') window.localStorage.removeItem(CURRENT_BACKEND_USER_STORAGE_KEY);
    }
  };

  const refetchBackendUser = async () => {
    const currentFbUser = firebaseAuth.currentUser; // Get current Firebase user instance
    if (_backendUserId && currentFbUser) {
      console.log("AuthContext: refetchBackendUser called. Fetching profile for backendUserId:", _backendUserId);
      setIsLoadingAuth(true);
      await fetchBackendUserProfile(_backendUserId, currentFbUser); // Pass currentFbUser
      setIsLoadingAuth(false);
    } else {
      console.warn("AuthContext: refetchBackendUser called but backendUserId is null or no Firebase user is authenticated. BackendUserId:", _backendUserId, "Firebase User:", currentFbUser);
      setIsLoadingAuth(false); // Ensure loading is set to false if refetch cannot proceed
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser: _currentUser, firebaseUser, isLoadingAuth, backendUserId: _backendUserId, setBackendUser: setBackendUserContext, refetchBackendUser, setInternalPendingBackendId }}>
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

