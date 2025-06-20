
"use client";

import { useState, useEffect, type Dispatch, type SetStateAction } from 'react';

type SetValue<T> = Dispatch<SetStateAction<T>>;

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
        window.localStorage.setItem(key, JSON.stringify(initialValue));
        setStoredValue(initialValue);
      }
    } catch (error) {
      try {
        window.localStorage.setItem(key, JSON.stringify(initialValue));
      } catch (setError) {
        // Silent fail for setting initial value if read error occurred
      }
      setStoredValue(initialValue);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);


  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const currentLocalStorageValue = window.localStorage.getItem(key);
        if (JSON.stringify(storedValue) !== currentLocalStorageValue) {
          window.localStorage.setItem(key, JSON.stringify(storedValue));
        }
      } catch (error) {
         // Silent fail for setting value to local storage
      }
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}

export default useLocalStorage;
