
"use server";

import { db } from '@/lib/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import type { UserActivityInput, UserActivity } from '@/types';

const USER_ACTIVITIES_COLLECTION = 'userActivities';

/**
 * Logs a user activity to Firestore.
 * @param activityData The data for the activity to log.
 * @returns The created UserActivity object with its Firestore ID and timestamp.
 */
export async function logUserActivity(activityData: UserActivityInput): Promise<UserActivity> {
  try {
    const activityToCreate = {
      ...activityData,
      timestamp: Timestamp.now().toDate().toISOString(),
    };
    const docRef = await addDoc(collection(db, USER_ACTIVITIES_COLLECTION), activityToCreate);
    return { ...activityToCreate, id: docRef.id } as UserActivity;
  } catch (error: any) {
    console.error("Error logging user activity:", error);
    // In a real app, you might want to handle this more gracefully,
    // e.g., by queuing the activity or logging to a different system if Firestore fails.
    // For now, we re-throw to make it visible during development.
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to log user activity: ${message}`);
  }
}
