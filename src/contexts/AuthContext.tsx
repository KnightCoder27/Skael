
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
  const [isLoadingAuth, setIsLoadingAuth] = useState(true); // Start true
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
    console.log("AuthContext: setBackendUserContext called with user (notice countries array):", user);
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
    console.log(`AuthContext: Fetching backend profile for ID: ${idToFetch}, FB UID: ${fbUserForToken.uid}`);
    try {
      const token = await fbUserForToken.getIdToken(true);
      if (!token) {
        console.error("AuthContext: fetchBackendUserProfile - Failed to retrieve Firebase ID token.");
        toast({ title: "Authentication Error", description: "Session token unavailable.", variant: "destructive" });
        setBackendUserContext(null);
        return;
      }
      const response = await apiClient.get<any>(`/users/${idToFetch}`, { headers: { Authorization: `Bearer ${token}` } });
      const responseData = response.data;
      console.log("AuthContext: Raw response.data from backend GET /users/id:", responseData);

      // Determine the actual source of user profile data
      // Prioritize 'user_data', then 'user', then responseData itself
      let actualUserProfileData = responseData;
      if (responseData && typeof responseData === 'object' && responseData.user_data && typeof responseData.user_data === 'object') {
        console.log("AuthContext: Using responseData.user_data as profile source.");
        actualUserProfileData = responseData.user_data;
      } else if (responseData && typeof responseData === 'object' && responseData.user && typeof responseData.user === 'object') {
        console.log("AuthContext: Using responseData.user as profile source.");
        actualUserProfileData = responseData.user;
      } else {
        console.log("AuthContext: Using responseData directly as profile source.");
      }
      
      // Construct the backendUserObject ensuring id is present and correct
      // The `idToFetch` is the reliable ID for this user.
      // Backend should ideally also return the id within its user profile object.
      let backendUserObject: User = {
        id: actualUserProfileData.id || idToFetch, // Prioritize ID from payload, fallback to idToFetch
        username: actualUserProfileData.username || '',
        email_id: actualUserProfileData.email_id || '',
        // Spread other known fields, ensure they exist on actualUserProfileData
        phone_number: actualUserProfileData.phone_number,
        desired_job_role: actualUserProfileData.desired_job_role,
        skills: actualUserProfileData.skills,
        experience: actualUserProfileData.experience,
        preferred_locations: actualUserProfileData.preferred_locations,
        remote_preference: actualUserProfileData.remote_preference,
        professional_summary: actualUserProfileData.professional_summary,
        expected_salary: actualUserProfileData.expected_salary,
        resume: actualUserProfileData.resume,
        joined_date: actualUserProfileData.joined_date,
        match_scores: actualUserProfileData.match_scores,
        saved_jobs: actualUserProfileData.saved_jobs,
        countries: [], // Initialize countries, will be overwritten by logic below
      };
      
      // Clean up any top-level keys from responseData if actualUserProfileData was nested
      if (actualUserProfileData !== responseData) {
          for (const key in responseData) {
              if (!backendUserObject.hasOwnProperty(key) && key !== 'user_data' && key !== 'user' && key !== 'messages') {
                  (backendUserObject as any)[key] = responseData[key];
              }
          }
      }


      // Transform 'country' (string from backend) to 'countries' (string[] for frontend User type)
      if (actualUserProfileData && typeof actualUserProfileData.country === 'string' && actualUserProfileData.country.trim() !== '') {
        console.log("AuthContext: Found 'country' string in profile data:", actualUserProfileData.country);
        backendUserObject.countries = actualUserProfileData.country.split(',').map((c: string) => c.trim()).filter((c: string) => c);
      } else if (actualUserProfileData && Array.isArray(actualUserProfileData.countries) && actualUserProfileData.countries.length > 0) {
        // This case handles if backend might sometimes send it as an array (less likely now but good fallback)
        console.log("AuthContext: Found 'countries' array in profile data:", actualUserProfileData.countries);
        backendUserObject.countries = actualUserProfileData.countries.map((c: any) => String(c).trim()).filter((c: string) => c);
      } else {
        console.log("AuthContext: No 'country' string or 'countries' array found in profile data. Defaulting to empty array.");
        backendUserObject.countries = []; // Default to empty array if no country data
      }
      
      // Ensure the raw 'country' field (string) is not part of the final frontend User object
      // if it was spread from actualUserProfileData, as 'User' type expects 'countries' (array).
      if ('country' in backendUserObject && typeof (backendUserObject as any).country === 'string') {
        delete (backendUserObject as any).country;
      }

      console.log("AuthContext: Processed backendUserObject (pre-context set):", backendUserObject);
      setBackendUserContext(backendUserObject);
    } catch (error) {
      console.error(`AuthContext: fetchBackendUserProfile - Failed for ID ${idToFetch}:`, error);
      toast({ title: "Session Error", description: "Could not load your profile data.", variant: "destructive" });
      setBackendUserContext(null);
    }
  }, [toast, setBackendUserContext]);

  useEffect(() => {
    console.log("AuthContext: Main auth effect running. Initializing auth state check.");
    let initialBackendIdFromStorage: number | null = null;
    let initialEmailFromStorage: string | null = null;
    if (typeof window !== 'undefined') {
        try {
            const storedUserString = window.localStorage.getItem(CURRENT_BACKEND_USER_STORAGE_KEY);
            if (storedUserString) {
                const storedUser = JSON.parse(storedUserString) as User;
                if (storedUser && typeof storedUser.id === 'number' && storedUser.email_id) {
                    console.log("AuthContext: Found user hint in localStorage:", storedUser.id, storedUser.email_id);
                    initialBackendIdFromStorage = storedUser.id;
                    initialEmailFromStorage = storedUser.email_id;
                }
            }
        } catch (e) { console.warn("AuthContext: Error reading localStorage initially", e); }
    }

    const unsubscribe = onAuthStateChanged(firebaseAuth, async (fbUser) => {
      console.log(`AuthContext: onAuthStateChanged. FB User: ${fbUser?.uid}. Current isLoggingOut: ${isLoggingOut}.`);
      setIsLoadingAuth(true); 

      if (isLoggingOut) {
        if (!fbUser) { 
          console.log("AuthContext: Logout confirmed (fbUser is null while isLoggingOut=true). Finalizing.");
          setFirebaseUser(null);
          setBackendUserContext(null);
          pendingBackendIdRef.current = null;
          setIsLoggingOutState(false); 
        } else { 
          console.warn("AuthContext: fbUser present during isLoggingOut. Awaiting full logout confirmation from Firebase.");
        }
        setIsLoadingAuth(false); 
        return;
      }

      if (fbUser) {
        console.log(`AuthContext: Firebase user ${fbUser.uid} detected (not logging out).`);
        setFirebaseUser(fbUser);
        
        const idFromPendingRef = pendingBackendIdRef.current;
        let idToFetchProfileFor: number | null = null;

        if (idFromPendingRef !== null) {
          idToFetchProfileFor = idFromPendingRef;
          console.log(`AuthContext: Using pendingBackendIdRef: ${idToFetchProfileFor} to fetch profile.`);
          pendingBackendIdRef.current = null; 
        } else if (initialBackendIdFromStorage !== null && initialEmailFromStorage === fbUser.email) {
          idToFetchProfileFor = initialBackendIdFromStorage;
          console.log(`AuthContext: Using ID from localStorage: ${idToFetchProfileFor} (email match verified).`);
        } else if (initialBackendIdFromStorage !== null && initialEmailFromStorage !== fbUser.email) {
            console.warn("AuthContext: Email mismatch between Firebase user and localStorage. Clearing local backend user data.");
            setBackendUserContext(null); 
        }

        if (idToFetchProfileFor !== null) {
          await fetchBackendUserProfile(idToFetchProfileFor, fbUser);
        } else {
          console.warn(`AuthContext: Firebase user ${fbUser.uid} exists, but no backend user ID could be determined (pending or localStorage). Backend user state not loaded.`);
          setBackendUserContext(null); 
        }
      } else { 
        console.log("AuthContext: No Firebase user (initial or session expired). Clearing states.");
        setFirebaseUser(null);
        setBackendUserContext(null);
        pendingBackendIdRef.current = null;
      }
      setIsLoadingAuth(false);
      console.log("AuthContext: isLoadingAuth set to false at end of onAuthStateChanged processing.");
    });

    return () => {
      console.log("AuthContext: Unsubscribing from onAuthStateChanged.");
      unsubscribe();
    };
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
          console.log("AuthContext: refetchBackendUser. Fetching for backend ID:", currentBackendId);
          setIsLoadingAuth(true);
          await fetchBackendUserProfile(currentBackendId, currentFbUser);
          setIsLoadingAuth(false);
        } else {
          console.warn("AuthContext: refetchBackendUser - No backend ID or Firebase user.");
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
