
"use client";

import type { User, UserModifyResponse } from '@/types'; // Added UserModifyResponse
import React, { createContext, useContext, useState, useEffect, type ReactNode, useCallback, useRef } from 'react';
import { auth as firebaseAuth } from '@/lib/firebase';
import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import apiClient from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import { AxiosError } from 'axios';

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
    setIsLoggingOutState(loggingOut);
  }, []);

  const setPendingBackendIdForFirebaseAuth = useCallback((id: number | null) => {
    pendingBackendIdRef.current = id;
  }, []);

  const setBackendUserContext = useCallback((user: User | null) => {
    setCurrentUser(user);
    if (user) {
      setBackendUserIdState(user.id);
      if (typeof window !== 'undefined') window.localStorage.setItem(CURRENT_BACKEND_USER_STORAGE_KEY, JSON.stringify(user));
    } else {
      setBackendUserIdState(null);
      if (typeof window !== 'undefined') window.localStorage.removeItem(CURRENT_BACKEND_USER_STORAGE_KEY);
    }
  }, []);

  const fetchBackendUserProfile = useCallback(async (idToFetch: number, fbUserForToken: FirebaseUser) => {
    try {
      const token = await fbUserForToken.getIdToken(true);
      if (!token) {
        toast({ title: "Authentication Error", description: "Session token unavailable.", variant: "destructive" });
        setBackendUserContext(null);
        return;
      }
      // Backend docs: GET /users/{id} returns UserOut
      // Assuming UserOut is the structure of our frontend User type
      const response = await apiClient.get<User>(`/users/${idToFetch}`, { headers: { Authorization: `Bearer ${token}` } });
      
      let actualUserProfileData = response.data;

      // Check for potential nesting like user_data or user if the direct response isn't the User object
      // This part might be redundant if backend directly returns UserOut structure
      if (response.data && typeof response.data === 'object') {
        if ('user_data' in response.data && typeof (response.data as any).user_data === 'object') {
          actualUserProfileData = (response.data as any).user_data;
        } else if ('user' in response.data && typeof (response.data as any).user === 'object') {
          actualUserProfileData = (response.data as any).user;
        }
      }
      
      let backendUserObject: User = {
        ...actualUserProfileData, // Spread first to get all fields
        id: actualUserProfileData.id || idToFetch, // Ensure ID is correct
        username: actualUserProfileData.username || '',
        email_id: actualUserProfileData.email_id || fbUserForToken.email || '',
        countries: [], // Initialize
      };
      
      // Transform 'country' (string from backend) to 'countries' (string[] for frontend User type)
      if (actualUserProfileData && typeof (actualUserProfileData as any).country === 'string' && (actualUserProfileData as any).country.trim() !== '') {
        backendUserObject.countries = (actualUserProfileData as any).country.split(',').map((c: string) => c.trim()).filter((c: string) => c);
      } else if (actualUserProfileData && Array.isArray((actualUserProfileData as any).countries) && (actualUserProfileData as any).countries.length > 0) {
        backendUserObject.countries = (actualUserProfileData as any).countries.map((c: any) => String(c).trim()).filter((c: string) => c);
      }
      
      if ('country' in backendUserObject && typeof (backendUserObject as any).country === 'string') {
        delete (backendUserObject as any).country;
      }

      setBackendUserContext(backendUserObject);
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 204) {
        toast({ title: "Profile Not Found", description: "Your user profile could not be loaded from the server.", variant: "destructive" });
      } else {
        toast({ title: "Session Error", description: "Could not load your profile data.", variant: "destructive" });
      }
      console.error(`AuthContext: fetchBackendUserProfile - Failed for ID ${idToFetch}:`, error);
      setBackendUserContext(null);
    }
  }, [toast, setBackendUserContext]);

  useEffect(() => {
    let initialBackendIdFromStorage: number | null = null;
    let initialEmailFromStorage: string | null = null;
    if (typeof window !== 'undefined') {
        try {
            const storedUserString = window.localStorage.getItem(CURRENT_BACKEND_USER_STORAGE_KEY);
            if (storedUserString) {
                const storedUser = JSON.parse(storedUserString) as User;
                if (storedUser && typeof storedUser.id === 'number' && storedUser.email_id) {
                    initialBackendIdFromStorage = storedUser.id;
                    initialEmailFromStorage = storedUser.email_id;
                }
            }
        } catch (e) { console.warn("AuthContext: Error reading localStorage initially", e); }
    }

    const unsubscribe = onAuthStateChanged(firebaseAuth, async (fbUser) => {
      setIsLoadingAuth(true); 

      if (isLoggingOut) {
        if (!fbUser) { 
          setFirebaseUser(null);
          setBackendUserContext(null);
          pendingBackendIdRef.current = null;
          setIsLoggingOutState(false); 
        }
        setIsLoadingAuth(false); 
        return;
      }

      if (fbUser) {
        setFirebaseUser(fbUser);
        const idFromPendingRef = pendingBackendIdRef.current;
        let idToFetchProfileFor: number | null = null;

        if (idFromPendingRef !== null) {
          idToFetchProfileFor = idFromPendingRef;
          pendingBackendIdRef.current = null; 
        } else if (initialBackendIdFromStorage !== null && initialEmailFromStorage === fbUser.email) {
          idToFetchProfileFor = initialBackendIdFromStorage;
        } else if (initialBackendIdFromStorage !== null && initialEmailFromStorage !== fbUser.email) {
            setBackendUserContext(null); 
        }

        if (idToFetchProfileFor !== null) {
          await fetchBackendUserProfile(idToFetchProfileFor, fbUser);
        } else {
          setBackendUserContext(null); 
        }
      } else { 
        setFirebaseUser(null);
        setBackendUserContext(null);
        pendingBackendIdRef.current = null;
      }
      setIsLoadingAuth(false);
    });

    return () => unsubscribe();
  }, [fetchBackendUserProfile, setBackendUserContext, isLoggingOut, setIsLoggingOutContext]); 

  const value = {
      currentUser,
      firebaseUser,
      isLoadingAuth,
      backendUserId,
      setBackendUser: setBackendUserContext,
      refetchBackendUser: async () => {
        const currentFbUser = firebaseUser;
        const currentBackendId = backendUserId;
        if (currentBackendId !== null && currentFbUser) {
          setIsLoadingAuth(true);
          await fetchBackendUserProfile(currentBackendId, currentFbUser);
          setIsLoadingAuth(false);
        } else {
          if (!currentFbUser) setBackendUserContext(null);
          if (isLoadingAuth) setIsLoadingAuth(false); 
        }
      },
      setPendingBackendIdForFirebaseAuth,
      isLoggingOut,
      setIsLoggingOut: setIsLoggingOutContext
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
