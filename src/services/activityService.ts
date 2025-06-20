
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
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to log user activity: ${message}`);
  }
}
