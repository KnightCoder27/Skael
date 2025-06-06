
"use client";

import { useState, useEffect, Dispatch, SetStateAction } from 'react';

type SetValue<T> = Dispatch<SetStateAction<T>>;

function useLocalStorage<T>(key: string, initialValue: T): [T, SetValue<T>] {
  // Always initialize state with initialValue to ensure server and initial client render match.
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  // useEffect to load the value from localStorage after the component has mounted on the client.
  useEffect(() => {
    // This check ensures the code runs only on the client.
    if (typeof window === 'undefined') {
      return;
    }
    try {
      const item = window.localStorage.getItem(key);
      // If item exists in localStorage, parse it and update state.
      // Otherwise, storedValue remains initialValue.
      if (item) {
        setStoredValue(JSON.parse(item));
      }
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}" on mount:`, error);
      // In case of an error, state remains initialValue.
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps 
  }, [key]); // Dependencies array ensures this effect runs once on mount (per key).

  // useEffect to update localStorage whenever storedValue changes.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(key, JSON.stringify(storedValue));
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error);
      }
    }
    // Do not include initialValue in dependencies if you only want to react to storedValue changes.
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}

export default useLocalStorage;
