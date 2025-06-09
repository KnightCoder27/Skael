
"use client";

import { useEffect, useState } from 'react';
import { useForm, type SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import type { User, UserUpdateAPI, RemotePreferenceAPI } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { User as UserIcon, Edit3, FileText, Wand2, Phone, Briefcase, DollarSign, CloudSun, BookUser, ListChecks, MapPin, Globe, Trash2, AlertTriangle } from 'lucide-react';
import { FullPageLoading } from '@/components/app/loading-spinner';
import apiClient from '@/lib/apiClient';
import { auth as firebaseAuth, db } from '@/lib/firebase'; // Import firebaseAuth
import { deleteUser as deleteFirebaseUser } from 'firebase/auth'; // For deleting Firebase user
import { AxiosError } from 'axios';


const remotePreferenceOptions: RemotePreferenceAPI[] = ["Remote", "Hybrid", "Onsite"]; // "Any" might not be directly supported by backend enum

// Schema aligned with UserUpdateAPI and User (UserOut from backend)
const profileSchema = z.object({
  username: z.string().min(2, 'Name should be at least 2 characters.').max(50, 'Name cannot exceed 50 characters.'),
  email_id: z.string().email('Invalid email address.'), // Readonly, for display
  phone_number: z.string().max(20, 'Phone number cannot exceed 20 characters.').optional().nullable(),
  
  professional_summary: z.string().min(50, 'Profile summary should be at least 50 characters.').optional().nullable(),
  job_role: z.string().min(10, 'Job preferences should be at least 10 characters.').optional().nullable(), // was desired_job_role
  
  skills: z.string().max(500, 'Skills list cannot exceed 500 characters (comma-separated).').optional().nullable(), // For UserUpdateAPI (comma-separated)
  
  experience: z.coerce.number().int().nonnegative('Experience must be a positive number.').optional().nullable(),
  
  preferred_locations: z.string().max(255, 'Preferred Locations cannot exceed 255 characters (comma-separated).').optional().nullable(), // For UserUpdateAPI
  
  remote_preference: z.enum(remotePreferenceOptions).optional().nullable(),
  expected_salary: z.coerce.number().positive("Expected salary must be a positive number.").optional().nullable(), // API expects number
  resume: z.string().url('Please enter a valid URL for your resume.').max(255, 'Resume URL cannot exceed 255 characters.').optional().nullable(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { currentUser, firebaseUser, isLoadingAuth, backendUserId, setBackendUser, refetchBackendUser } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    // Default values will be set by useEffect based on currentUser
  });
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset, control } = form;

  useEffect(() => {
    if (!isLoadingAuth && !firebaseUser) { // Check firebaseUser for auth status
      toast({ title: "Not Authenticated", description: "Please log in to view your profile.", variant: "destructive" });
      router.push('/auth');
    } else if (!isLoadingAuth && firebaseUser && !currentUser) {
        // Firebase user exists, but backend profile might not be loaded yet or doesn't exist
        // AuthContext should handle fetching it. If it's still null, could mean new user or error.
        // For new user, profile page can be their first stop.
        // Let's ensure email is populated from firebaseUser if backend currentUser is not yet there
        if (firebaseUser.email) {
             reset({ email_id: firebaseUser.email, username: firebaseUser.displayName || "" });
        }
    } else if (currentUser) {
      reset({
        username: currentUser.username || firebaseUser?.displayName || '',
        email_id: currentUser.email_id || firebaseUser?.email || '',
        phone_number: currentUser.phone_number || null,
        professional_summary: currentUser.professional_summary || null,
        job_role: currentUser.job_role || null,
        skills: currentUser.skills?.join(', ') || null, // Convert array to comma-separated string for form
        experience: currentUser.experience ?? null,
        preferred_locations: currentUser.preferred_locations?.join(', ') || null, // Convert array to comma-separated for form
        remote_preference: currentUser.remote_preference as RemotePreferenceAPI || null,
        expected_salary: currentUser.expected_salary ?? null,
        resume: currentUser.resume || null,
      });
    }
  }, [currentUser, firebaseUser, isLoadingAuth, reset, router, toast]);

  const onSubmit: SubmitHandler<ProfileFormValues> = async (data) => {
    if (!backendUserId) {
      toast({ title: "Error", description: "User session not found. Cannot update profile.", variant: "destructive" });
      return;
    }
    
    const updatePayload: UserUpdateAPI = {
      username: data.username,
      number: data.phone_number || undefined, // API expects string or undefined
      desired_job_role: data.job_role || undefined,
      skills: data.skills || undefined, // Already comma-separated string from form
      experience: data.experience ?? undefined, // Ensure null becomes undefined if API expects optional fields not nulls
      preferred_locations: data.preferred_locations || undefined, // Already comma-separated
      remote_preference: data.remote_preference || undefined,
      professional_summary: data.professional_summary || undefined,
      expected_salary: data.expected_salary ?? undefined,
      resume: data.resume || undefined,
    };

    // Filter out null values if API expects only defined fields
    const filteredUpdatePayload = Object.fromEntries(
        Object.entries(updatePayload).filter(([_, v]) => v !== null && v !== undefined)
    );


    try {
      await apiClient.put(`/users/${backendUserId}`, filteredUpdatePayload);
      await refetchBackendUser(); // Refetch updated user data
      toast({
        title: 'Profile Updated',
        description: 'Your profile information has been saved successfully.',
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      let errorMessage = "Could not update profile. Please try again.";
       if (error instanceof AxiosError && error.response) {
        errorMessage = error.response.data?.detail || error.response.data?.msg || errorMessage;
      }
      toast({ title: "Update Failed", description: errorMessage, variant: "destructive" });
    }
  };

  const handleGenerateGeneralResume = () => {
    toast({ title: "Coming Soon!", description: "General resume generation will be available soon." });
  };

  const handleGenerateCustomCoverLetter = () => {
    toast({ title: "Coming Soon!", description: "Custom cover letter generation will be available soon." });
  };

  const handleDeleteAccountConfirm = async () => {
    if (!backendUserId || !firebaseUser) {
      toast({ title: "Error", description: "User session not found. Cannot delete account.", variant: "destructive" });
      return;
    }
    try {
      // 1. Delete from custom backend
      await apiClient.delete(`/users/${backendUserId}`);
      
      // 2. Delete from Firebase Authentication
      await deleteFirebaseUser(firebaseUser); // This will also sign the user out

      setBackendUser(null); // Clear user from context
      // AuthContext's onAuthStateChanged will handle firebaseUser becoming null

      toast({
        title: "Account Deleted",
        description: "Your account has been permanently deleted.",
        variant: "destructive",
      });
      router.push('/auth'); // Redirect to auth page
    } catch (error) {
      console.error("Error deleting account:", error);
      let errorMessage = "Could not delete account. Please try again.";
       if (error instanceof AxiosError && error.response) {
        errorMessage = error.response.data?.detail || error.response.data?.msg || "Failed to delete account from backend.";
      } else if (error instanceof Error && (error as any).code?.startsWith('auth/')) {
        errorMessage = "Failed to delete Firebase account. You might need to re-authenticate.";
        // If Firebase deletion fails, the backend deletion might need to be rolled back or handled.
      }
      toast({ title: "Deletion Failed", description: errorMessage, variant: "destructive" });
    }
  };

  if (isLoadingAuth || (!firebaseUser && !isLoadingAuth)) { // Show loading if auth state is loading or if no firebase user yet
    return <FullPageLoading message="Loading profile..." />;
  }
  
  // If firebaseUser exists but currentUser (backend profile) is null, it might be a new user or loading
  // The form is still useful for a new user to fill out their profile for the first time.
  // Form default values are set from currentUser or firebaseUser in useEffect.

  return (
    <div className="space-y-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold font-headline flex items-center">
          <UserIcon className="mr-3 h-8 w-8 text-primary" />
          My Profile
        </h1>
        <p className="text-muted-foreground">
          Keep your profile and job preferences up-to-date for the best job matches.
        </p>
      </header>

      <Card className="shadow-lg">
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardHeader>
            <CardTitle className="font-headline text-xl">Personal & Contact Information</CardTitle>
            <CardDescription>
              Basic information about you. Your email is used for account identity.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="username">Full Name</Label>
                <Input id="username" {...register('username')} placeholder="Your Full Name" className={errors.username ? 'border-destructive' : ''} />
                {errors.username && <p className="text-sm text-destructive">{errors.username.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email_id">Email Address</Label>
                <Input
                  id="email_id"
                  type="email"
                  {...register('email_id')}
                  placeholder="you@example.com"
                  className={errors.email_id ? 'border-destructive' : ''}
                  readOnly
                />
                {errors.email_id && <p className="text-sm text-destructive">{errors.email_id.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6"> {/* Reduced to 2 for phone and locations string for now */}
              <div className="space-y-2">
                <Label htmlFor="phone_number">Phone Number</Label>
                <div className="relative flex items-center">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="phone_number" type="tel" {...register('phone_number')} placeholder="(123) 456-7890" className={`pl-10 ${errors.phone_number ? 'border-destructive' : ''}`} />
                </div>
                 <p className="text-xs text-muted-foreground">Optional.</p>
                {errors.phone_number && <p className="text-sm text-destructive">{errors.phone_number.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="preferred_locations">Preferred Locations (comma-separated)</Label>
                 <div className="relative flex items-center">
                    <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="preferred_locations" {...register('preferred_locations')} placeholder="e.g., New York, Remote, London" className={`pl-10 ${errors.preferred_locations ? 'border-destructive' : ''}`} />
                </div>
                <p className="text-xs text-muted-foreground">Optional. Enter cities or "Remote".</p>
                {errors.preferred_locations && <p className="text-sm text-destructive">{errors.preferred_locations.message}</p>}
              </div>
            </div>
          </CardContent>

          <Separator className="my-6" />

          <CardHeader>
            <CardTitle className="font-headline text-xl">Professional Background</CardTitle>
            <CardDescription>
              Your experience, skills, and resume summary are crucial for AI matching.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="professional_summary" className="text-base flex items-center"><BookUser className="mr-2 h-5 w-5 text-primary/80"/>Professional Summary</Label>
              <Textarea
                id="professional_summary"
                {...register('professional_summary')}
                placeholder="A detailed summary of your professional background, achievements, and career goals."
                rows={8}
                className={errors.professional_summary ? 'border-destructive' : ''}
              />
              {errors.professional_summary && <p className="text-sm text-destructive">{errors.professional_summary.message}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label htmlFor="experience">Years of Professional Experience</Label>
                    <div className="relative flex items-center">
                        <Briefcase className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input id="experience" type="number" {...register('experience')} placeholder="e.g., 5" className={`pl-10 ${errors.experience ? 'border-destructive' : ''}`} />
                    </div>
                    <p className="text-xs text-muted-foreground">Optional.</p>
                    {errors.experience && <p className="text-sm text-destructive">{errors.experience.message}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="resume">Resume URL</Label>
                     <div className="relative flex items-center">
                        <FileText className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input id="resume" {...register('resume')} placeholder="https://example.com/your-resume.pdf" className={`pl-10 ${errors.resume ? 'border-destructive' : ''}`} />
                    </div>
                    <p className="text-xs text-muted-foreground">Optional.</p>
                    {errors.resume && <p className="text-sm text-destructive">{errors.resume.message}</p>}
                </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="skills" className="text-base flex items-center"><ListChecks className="mr-2 h-5 w-5 text-primary/80"/>Key Skills (comma-separated)</Label>
              <Textarea
                id="skills"
                {...register('skills')}
                placeholder="e.g., React, Node.js, Python, Project Management, UI/UX Design"
                rows={3}
                className={errors.skills ? 'border-destructive' : ''}
              />
              <p className="text-xs text-muted-foreground">Optional. This helps AI find relevant jobs.</p>
              {errors.skills && <p className="text-sm text-destructive">{errors.skills.message}</p>}
            </div>
          </CardContent>

          <Separator className="my-6" />

          <CardHeader>
            <CardTitle className="font-headline text-xl">Job Preferences</CardTitle>
            <CardDescription>
              Help us tailor job suggestions to your ideal role and work environment.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="job_role" className="text-base">Ideal Job Role</Label>
              <Textarea
                id="job_role"
                {...register('job_role')}
                placeholder="e.g., Senior Frontend Developer specializing in e-commerce, interested in mid-size tech companies..."
                rows={5}
                className={errors.job_role ? 'border-destructive' : ''}
              />
              {errors.job_role && <p className="text-sm text-destructive">{errors.job_role.message}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label htmlFor="remote_preference">Remote Work Preference</Label>
                    <Controller
                        name="remote_preference"
                        control={control}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                                <SelectTrigger className={`relative w-full justify-start pl-10 pr-3 ${errors.remote_preference ? 'border-destructive' : ''}`}>
                                     <CloudSun className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                                    <SelectValue placeholder="Select preference" />
                                </SelectTrigger>
                                <SelectContent>
                                    {remotePreferenceOptions.map(option => (
                                        <SelectItem key={option} value={option}>{option}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    />
                    <p className="text-xs text-muted-foreground">Optional.</p>
                    {errors.remote_preference && <p className="text-sm text-destructive">{errors.remote_preference.message}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="expected_salary">Expected Salary (Numeric)</Label>
                     <div className="relative flex items-center">
                        <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input id="expected_salary" type="number" {...register('expected_salary')} placeholder="e.g., 120000" className={`pl-10 ${errors.expected_salary ? 'border-destructive' : ''}`} />
                    </div>
                    <p className="text-xs text-muted-foreground">Optional. Enter as a number (e.g., 120000 for $120,000).</p>
                    {errors.expected_salary && <p className="text-sm text-destructive">{errors.expected_salary.message}</p>}
                </div>
            </div>
          </CardContent>
          <CardFooter className="flex-col items-start gap-4 sm:flex-row sm:justify-between sm:items-center pt-6 border-t">
            <Button type="submit" disabled={isSubmitting} size="lg" className="shadow-md hover:shadow-lg transition-shadow">
              {isSubmitting ? 'Saving...' : 'Save Profile'}
              {!isSubmitting && <Edit3 className="ml-2 h-4 w-4" />}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Separator className="my-10" />

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-xl flex items-center">
            <Wand2 className="mr-2 h-6 w-6 text-primary" /> Global AI Document Tools
          </CardTitle>
          <CardDescription>
            Generate general application materials based on your saved profile or for any job description. (Functionality to be connected to backend API)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-0 sm:flex sm:gap-4">
          <Button onClick={handleGenerateGeneralResume} variant="outline" size="lg" className="w-full sm:w-auto" disabled>
            <FileText className="mr-2 h-5 w-5" /> Generate General Resume
          </Button>
          <Button onClick={handleGenerateCustomCoverLetter} variant="outline" size="lg" className="w-full sm:w-auto" disabled>
            <FileText className="mr-2 h-5 w-5" /> Generate Cover Letter for any JD
          </Button>
        </CardContent>
         <CardFooter className="text-xs text-muted-foreground pt-4">
          These tools will use your saved profile information. Ensure your profile is up-to-date for best results.
        </CardFooter>
      </Card>

      <Separator className="my-10" />

      <Card className="shadow-lg border-destructive">
        <CardHeader>
          <CardTitle className="font-headline text-xl flex items-center text-destructive">
            <AlertTriangle className="mr-2 h-6 w-6" /> Danger Zone
          </CardTitle>
          <CardDescription>
            Proceed with caution. These actions are irreversible.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full sm:w-auto">
                <Trash2 className="mr-2 h-4 w-4" /> Delete Account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center">
                   <AlertTriangle className="mr-2 h-5 w-5 text-destructive" /> Are you absolutely sure?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your account from our backend and Firebase Authentication.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAccountConfirm} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                  Yes, delete account
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground pt-4">
          Deleting your account will remove all your saved information.
        </CardFooter>
      </Card>

    </div>
  );
}

