
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
  setBackendUser: (user: User | null) => void;
  refetchBackendUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, _setCurrentUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [backendUserId, setBackendUserIdState] = useState<number | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const { toast } = useToast();

  const fetchBackendUserProfile = useCallback(async (id: number) => {
    if (!firebaseAuth.currentUser) {
      console.warn("AuthContext: Attempted to fetch backend user profile, but no Firebase user is authenticated.");
      _setCurrentUser(null);
      setBackendUserIdState(null);
      if (typeof window !== 'undefined') window.localStorage.removeItem(CURRENT_BACKEND_USER_STORAGE_KEY);
      return;
    }
    console.log(`AuthContext: Fetching backend user profile for ID: ${id}`);
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
      toast({ title: "Session Error", description: "Could not load your profile. Please log in again.", variant: "destructive" });
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
                console.log("AuthContext: Loaded currentUser from localStorage on mount:", parsedUser);
            }
        } catch (error) {
            console.warn("Error reading currentBackendUser from localStorage on mount:", error);
            window.localStorage.removeItem(CURRENT_BACKEND_USER_STORAGE_KEY);
        }
    }

    const unsubscribe = onAuthStateChanged(firebaseAuth, async (fbUser) => {
      console.log("AuthContext: onAuthStateChanged triggered. Firebase user:", fbUser?.uid);
      setIsLoadingAuth(true);
      setFirebaseUser(fbUser);

      if (fbUser) {
        const pendingIdStr = typeof window !== 'undefined' ? localStorage.getItem(PENDING_LOGIN_BACKEND_ID_KEY) : null;

        if (pendingIdStr) {
          if (typeof window !== 'undefined') localStorage.removeItem(PENDING_LOGIN_BACKEND_ID_KEY); // Remove immediately
          const pendingId = parseInt(pendingIdStr, 10);
          if (!isNaN(pendingId)) {
            console.log(`AuthContext: Processing pendingLoginBackendId: ${pendingId}. Fetching profile.`);
            await fetchBackendUserProfile(pendingId);
          } else {
            console.error("AuthContext: Invalid pendingLoginBackendId found. Clearing user state.");
            _setCurrentUser(null);
            setBackendUserIdState(null);
             if (typeof window !== 'undefined') window.localStorage.removeItem(CURRENT_BACKEND_USER_STORAGE_KEY);
          }
        } else if (backendUserId && (!currentUser || currentUser.id !== backendUserId)) {
          console.log(`AuthContext: backendUserId ${backendUserId} exists from previous session, currentUser in memory is stale/null (${currentUser?.id}). Re-fetching profile.`);
          await fetchBackendUserProfile(backendUserId);
        } else if (currentUser && currentUser.id === backendUserId && backendUserId !== null) {
          console.log(`AuthContext: User profile (ID: ${currentUser.id}) already loaded and consistent with backendUserId (${backendUserId}).`);
        } else if (!backendUserId && !currentUser) {
            // This means Firebase user is present, but we have no backend ID from localStorage (neither pending nor from a stored currentUser)
            // This could be a new session where localStorage was cleared or first time login on a new browser without prior state.
            // The auth/page.tsx should have set pendingLoginBackendId. If it's missing, it's an issue.
             console.warn("AuthContext: Firebase user detected, but no pendingLoginBackendId and no existing backendUserId/currentUser. Waiting for login flow to provide ID or user to re-auth.");
             // We don't clear _setCurrentUser here, it might have been loaded from localStorage initially.
             // If it's truly a fresh login, pendingIdStr branch should have caught it.
        } else {
            console.log("AuthContext: Firebase user detected, no specific action needed based on pending/existing IDs. Current state:", { backendUserId, currentUserId: currentUser?.id });
        }
      } else {
        // No Firebase user / Logout
        console.log("AuthContext: No Firebase user (logout). Clearing user state.");
        _setCurrentUser(null);
        setBackendUserIdState(null);
        if (typeof window !== 'undefined') {
            window.localStorage.removeItem(CURRENT_BACKEND_USER_STORAGE_KEY);
            localStorage.removeItem(PENDING_LOGIN_BACKEND_ID_KEY);
        }
      }
      setIsLoadingAuth(false);
      console.log("AuthContext: setIsLoadingAuth(false). Final state:", { currentUID: _setCurrentUser ? (await Promise.resolve(_setCurrentUser).then(u => u?.id) || null) : null , fbUID: fbUser?.uid });
    });

    return () => {
      console.log("AuthContext: Unsubscribing from onAuthStateChanged.");
      unsubscribe();
    };
  }, [fetchBackendUserProfile, backendUserId, currentUser]); // Added backendUserId and currentUser to deps

  const setBackendUser = (user: User | null) => {
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
    if (backendUserId) {
      console.log("AuthContext: refetchBackendUser called. Fetching profile for backendUserId:", backendUserId);
      setIsLoadingAuth(true);
      await fetchBackendUserProfile(backendUserId);
      setIsLoadingAuth(false);
    } else {
        console.warn("AuthContext: refetchBackendUser called without a known backendUserId.");
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
