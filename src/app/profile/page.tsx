"use client";

import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import useLocalStorage from '@/hooks/use-local-storage';
import type { UserProfileData } from '@/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { User, Edit3 } from 'lucide-react';

const profileSchema = z.object({
  rawText: z.string().min(50, 'Profile text should be at least 50 characters.'),
  preferences: z.string().min(10, 'Preferences should be at least 10 characters.'),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const [userProfile, setUserProfile] = useLocalStorage<UserProfileData | null>('user-profile', null);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      rawText: userProfile?.rawText || '',
      preferences: userProfile?.preferences || '',
    },
  });

  const onSubmit: SubmitHandler<ProfileFormValues> = (data) => {
    setUserProfile(data);
    toast({
      title: 'Profile Updated',
      description: 'Your profile information has been saved successfully.',
    });
  };
  
  // Effect to reset form when userProfile changes from localStorage (e.g. across tabs)
  useState(() => {
    if (userProfile) {
      reset(userProfile);
    }
  });


  return (
    <div className="space-y-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold font-headline flex items-center">
          <User className="mr-3 h-8 w-8 text-primary" />
          My Profile
        </h1>
        <p className="text-muted-foreground">
          Keep your profile and job preferences up-to-date for the best job matches.
        </p>
      </header>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline">Edit Your Information</CardTitle>
          <CardDescription>
            Paste your resume or LinkedIn profile summary in the "Profile Text" field. 
            In "Job Preferences", describe your ideal role, desired location, salary expectations, etc.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="rawText" className="text-base">Profile Text (Resume/LinkedIn)</Label>
              <Textarea
                id="rawText"
                {...register('rawText')}
                placeholder="Paste your full resume or a detailed LinkedIn profile summary here..."
                rows={15}
                className={errors.rawText ? 'border-destructive' : ''}
              />
              {errors.rawText && <p className="text-sm text-destructive">{errors.rawText.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="preferences" className="text-base">Job Preferences</Label>
              <Textarea
                id="preferences"
                {...register('preferences')}
                placeholder="e.g., Looking for remote frontend developer roles, interested in startups, target salary $120k+, preferred technologies: React, Next.js..."
                rows={5}
                className={errors.preferences ? 'border-destructive' : ''}
              />
              {errors.preferences && <p className="text-sm text-destructive">{errors.preferences.message}</p>}
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSubmitting} size="lg" className="shadow-md hover:shadow-lg transition-shadow">
              {isSubmitting ? 'Saving...' : 'Save Profile'}
              {!isSubmitting && <Edit3 className="ml-2 h-4 w-4" />}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
