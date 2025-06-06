
"use client";

import { useState, useEffect, Dispatch, SetStateAction } from 'react';

type SetValue<T> = Dispatch<SetStateAction<T>>;

// This hook is now primarily for non-user-session data like 'tracked-applications' and 'job-ai-analysis-cache'.
// User profile data is managed via AuthContext and Firestore.

function useLocalStorage<T>(key: string, initialValue: T): [T, SetValue<T>] {
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        setStoredValue(JSON.parse(item));
      } else {
        // If item not found, ensure initialValue is set in localStorage if it's not already the state
        // This helps ensure consistency if initialValue is dynamic or a complex object.
        window.localStorage.setItem(key, JSON.stringify(initialValue));
        setStoredValue(initialValue); // Ensure state also reflects this
      }
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}" on mount:`, error);
      // If error, attempt to set initialValue to localStorage
      try {
        window.localStorage.setItem(key, JSON.stringify(initialValue));
      } catch (setError) {
        console.warn(`Error setting initial localStorage key "${key}" after read error:`, setError);
      }
      setStoredValue(initialValue); // Reset to initialValue in case of parsing error
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]); // Only run on mount (and if key changes, though not typical for this hook's usage pattern)


  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        // Only update localStorage if the new value is different from the current one to avoid unnecessary writes
        const currentLocalStorageValue = window.localStorage.getItem(key);
        if (JSON.stringify(storedValue) !== currentLocalStorageValue) {
          window.localStorage.setItem(key, JSON.stringify(storedValue));
        }
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error);
      }
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}

export default useLocalStorage;
