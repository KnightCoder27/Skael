
"use client";

import { useEffect, useState, ChangeEvent } from 'react';
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
import { User as UserIcon, Edit3, FileText, Wand2, Phone, Briefcase, DollarSign, CloudSun, BookUser, ListChecks, MapPin, Globe, Trash2, AlertTriangle, LogOut as LogOutIcon, MessageSquare, UploadCloud, Paperclip, XCircle } from 'lucide-react';
import { FullPageLoading, LoadingSpinner } from '@/components/app/loading-spinner';
import apiClient from '@/lib/apiClient';
import { auth as firebaseAuth, storage } from '@/lib/firebase';
import { deleteUser as deleteFirebaseUser } from 'firebase/auth';
import { ref as storageRef, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { AxiosError } from 'axios';
import { FeedbackDialog } from '@/components/app/feedback-dialog';
import { Progress } from '@/components/ui/progress';


const remotePreferenceOptions: RemotePreferenceAPI[] = ["Remote", "Hybrid", "Onsite"];

const profileSchema = z.object({
  username: z.string().min(2, 'Name should be at least 2 characters.').max(50, 'Name cannot exceed 50 characters.'),
  email_id: z.string().email('Invalid email address.'),
  phone_number: z.string().max(20, 'Phone number cannot exceed 20 characters.').optional().nullable(),
  professional_summary: z.string().min(50, 'Profile summary should be at least 50 characters.').optional().nullable(),
  desired_job_role: z.string().min(10, 'Ideal Job Role should be at least 10 characters.').optional().nullable(),
  skills: z.string().max(500, 'Skills list cannot exceed 500 characters (comma-separated).').optional().nullable(),
  experience: z.coerce.number().int().nonnegative('Experience must be a positive number.').optional().nullable(),
  preferred_locations: z.string().max(255, 'Preferred Locations cannot exceed 255 characters (comma-separated).').optional().nullable(),
  countries: z.string().min(1, 'Countries are required. Enter names or ISO alpha-2 codes (e.g., United States, CA).').max(255, 'Countries list cannot exceed 255 characters (comma-separated).'),
  remote_preference: z.enum(remotePreferenceOptions, { errorMap: () => ({ message: "Please select a valid remote preference."}) }).optional().nullable(),
  expected_salary: z.coerce.number().positive("Expected salary must be a positive number.").optional().nullable(),
  resume: z.string().url('Resume must be a valid URL (this will be the Firebase Storage URL).').max(1024, 'Resume URL too long.').optional().nullable(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { currentUser, firebaseUser, isLoadingAuth, backendUserId, setBackendUser, refetchBackendUser, isLoggingOut, setIsLoggingOut } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [selectedResumeFile, setSelectedResumeFile] = useState<File | null>(null);
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [uploadResumeProgress, setUploadResumeProgress] = useState<number | null>(null);
  const [currentResumeUrl, setCurrentResumeUrl] = useState<string | null>(null);
  const [hasPopulatedFromCurrentUser, setHasPopulatedFromCurrentUser] = useState(false);


  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: '',
      email_id: '',
      phone_number: null,
      professional_summary: null,
      desired_job_role: null,
      skills: null,
      experience: null,
      preferred_locations: null,
      countries: '',
      remote_preference: undefined,
      expected_salary: null,
      resume: null,
    }
  });
  const { register, handleSubmit, formState: { errors, isSubmitting: isFormSubmitting }, reset, control, setValue, watch } = form;

  const watchedResumeUrl = watch("resume");

  useEffect(() => {
    setCurrentResumeUrl(watchedResumeUrl ?? null);
  }, [watchedResumeUrl]);


  useEffect(() => {
    if (isLoggingOut) return;
    if (!isLoadingAuth && !currentUser && !firebaseUser) {
        toast({ title: "Not Authenticated", description: "Please log in to view your profile.", variant: "destructive" });
        router.push('/auth');
    }
  }, [isLoadingAuth, currentUser, firebaseUser, router, toast, isLoggingOut]);


  useEffect(() => {
    if (isLoadingAuth) return;

    if (isLoggingOut) {
        setHasPopulatedFromCurrentUser(false);
        return;
    }

    let formValuesToReset: Partial<ProfileFormValues> = {};
    let newResumeUrlToSet: string | null = null;

    if (currentUser && currentUser.id) {
        const currentRPFromDBRaw: string | null | undefined = currentUser.remote_preference;
        let formRPValue: RemotePreferenceAPI | undefined = undefined;

        if (typeof currentRPFromDBRaw === 'string' && currentRPFromDBRaw.trim() !== '') {
            const normalizedRP = currentRPFromDBRaw.toLowerCase().trim();
            switch (normalizedRP) {
                case "remote": formRPValue = "Remote"; break;
                case "hybrid": formRPValue = "Hybrid"; break;
                case "onsite": formRPValue = "Onsite"; break;
                default: break;
            }
        }

        formValuesToReset = {
            username: currentUser.username || firebaseUser?.displayName || '',
            email_id: currentUser.email_id || firebaseUser?.email || '',
            phone_number: currentUser.phone_number || null,
            professional_summary: currentUser.professional_summary || null,
            desired_job_role: currentUser.desired_job_role || null,
            skills: currentUser.skills?.join(', ') || null,
            experience: currentUser.experience ?? null,
            preferred_locations: currentUser.preferred_locations?.join(', ') || null,
            countries: currentUser.countries?.join(', ') || '',
            remote_preference: formRPValue,
            expected_salary: currentUser.expected_salary ?? null,
            resume: currentUser.resume || null,
        };
        newResumeUrlToSet = currentUser.resume || null;
        setHasPopulatedFromCurrentUser(true);

    } else if (firebaseUser && !currentUser && !hasPopulatedFromCurrentUser) {
        formValuesToReset = {
            username: firebaseUser.displayName || '',
            email_id: firebaseUser.email || '',
            phone_number: null, professional_summary: null, desired_job_role: null,
            skills: null, experience: null, preferred_locations: null, countries: '',
            remote_preference: undefined,
            expected_salary: null, resume: null,
        };
        newResumeUrlToSet = null;
    } else if (!firebaseUser && !currentUser) {
       setHasPopulatedFromCurrentUser(false);
       formValuesToReset = {
            username: '', email_id: '', phone_number: null, professional_summary: null, desired_job_role: null,
            skills: null, experience: null, preferred_locations: null, countries: '',
            remote_preference: undefined,
            expected_salary: null, resume: null,
       };
       newResumeUrlToSet = null;
    }

    if (Object.keys(formValuesToReset).length > 0 || newResumeUrlToSet !== currentResumeUrl) {
        reset(formValuesToReset);
        setCurrentResumeUrl(newResumeUrlToSet);
    }
}, [currentUser, firebaseUser, reset, isLoadingAuth, isLoggingOut, hasPopulatedFromCurrentUser, currentResumeUrl]);



  const handleResumeFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "File Too Large", description: "Resume file should be less than 5MB.", variant: "destructive" });
        event.target.value = '';
        return;
      }
      const allowedTypes = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
      if (!allowedTypes.includes(file.type)) {
        toast({ title: "Invalid File Type", description: "Please upload a PDF or Word document.", variant: "destructive" });
        event.target.value = '';
        return;
      }
      setSelectedResumeFile(file);
    } else {
      setSelectedResumeFile(null);
    }
  };

  const handleRemoveResume = async () => {
    if (!currentResumeUrl || !firebaseUser) return;

    setIsUploadingResume(true);
    try {
      const fileRef = storageRef(storage, currentResumeUrl);
      await deleteObject(fileRef);

      if (backendUserId) {
        await apiClient.put(`/users/${backendUserId}`, { resume: null });
        setValue('resume', null);
        setCurrentResumeUrl(null);
        setSelectedResumeFile(null);
        await refetchBackendUser();
        toast({ title: "Resume Removed", description: "Your resume has been removed." });
      }
    } catch (error) {
      console.error("Error removing resume:", error);
      toast({ title: "Removal Failed", description: "Could not remove resume. It might have already been deleted or there was a network issue.", variant: "destructive" });
    } finally {
      setIsUploadingResume(false);
    }
  };


  const onSubmit: SubmitHandler<ProfileFormValues> = async (data) => {
    if (!backendUserId || !firebaseUser) {
      toast({ title: "Error", description: "User session not found. Cannot update profile.", variant: "destructive" });
      return;
    }

    let newResumeUrl: string | null | undefined = data.resume;

    if (selectedResumeFile) {
      setIsUploadingResume(true);
      setUploadResumeProgress(0);
      const filePath = `users/${firebaseUser.uid}/uploaded_resumes/${Date.now()}_${selectedResumeFile.name}`;
      const fileStorageRef = storageRef(storage, filePath);
      const uploadTask = uploadBytesResumable(fileStorageRef, selectedResumeFile);

      try {
        await new Promise<void>((resolve, reject) => {
          uploadTask.on('state_changed',
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadResumeProgress(progress);
            },
            (error) => {
              console.error("Upload error:", error);
              reject(error);
            },
            async () => {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              newResumeUrl = downloadURL;
              setValue('resume', newResumeUrl);
              setCurrentResumeUrl(newResumeUrl);
              setSelectedResumeFile(null);
              resolve();
            }
          );
        });
      } catch (error) {
        toast({ title: "Resume Upload Failed", description: "Could not upload your resume. Please try again.", variant: "destructive" });
        setIsUploadingResume(false);
        setUploadResumeProgress(null);
        return;
      } finally {
        setIsUploadingResume(false);
        setUploadResumeProgress(null);
      }
    }

    const updatePayload: UserUpdateAPI = {
      username: data.username,
      number: data.phone_number || undefined,
      desired_job_role: data.desired_job_role || undefined,
      skills: data.skills || undefined,
      experience: data.experience ?? undefined,
      preferred_locations: data.preferred_locations || undefined,
      country: data.countries, // RENAMED KEY
      remote_preference: data.remote_preference || undefined,
      professional_summary: data.professional_summary || undefined,
      expected_salary: data.expected_salary ?? undefined,
      resume: newResumeUrl,
    };

    const filteredUpdatePayload = Object.fromEntries(
        Object.entries(updatePayload).filter(([_, v]) => v !== undefined)
    ) as Partial<UserUpdateAPI>;

    console.log("ProfilePage: Attempting to update profile with payload:", filteredUpdatePayload);

    try {
      await apiClient.put(`/users/${backendUserId}`, filteredUpdatePayload);
      await refetchBackendUser();
      toast({
        title: 'Profile Updated',
        description: 'Your profile information has been saved successfully.',
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      let errorMessage = "Could not update profile. Please try again.";
       if (error instanceof AxiosError && error.response) {
        errorMessage = error.response.data?.detail || error.response.data?.messages || errorMessage;
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
    setIsLoggingOut(true);
    try {
      if (currentUser?.resume) {
        try {
            const oldResumeRef = storageRef(storage, currentUser.resume);
            await deleteObject(oldResumeRef);
            console.log("Old resume deleted from Firebase Storage during account deletion.");
        } catch (storageError) {
            console.warn("Could not delete resume from storage during account deletion:", storageError);
        }
      }
      await apiClient.delete(`/users/${backendUserId}`);
      await deleteFirebaseUser(firebaseUser);

      toast({
        title: "Account Deleted",
        description: "Your account has been permanently deleted.",
        variant: "destructive",
      });
    } catch (error) {
      console.error("Error deleting account:", error);
      let errorMessage = "Could not delete account. Please try again.";
       if (error instanceof AxiosError && error.response) {
        errorMessage = error.response.data?.detail || error.response.data?.messages || "Failed to delete account from backend.";
      } else if (error instanceof Error && (error as any).code?.startsWith('auth/')) {
        errorMessage = "Failed to delete Firebase account. You might need to re-authenticate.";
      }
      toast({ title: "Deletion Failed", description: errorMessage, variant: "destructive" });
      setIsLoggingOut(false);
    }
  };

  if (isLoggingOut) {
    return (
      <div className="flex min-h-[calc(100vh-12rem)] flex-col items-center justify-center p-4 text-center">
        <LogOutIcon className="w-12 h-12 text-primary mb-4 animate-pulse" />
        <h2 className="text-2xl font-semibold mb-2">Logging Out</h2>
        <p className="text-muted-foreground">Please wait...</p>
      </div>
    );
  }

  if (isLoadingAuth) {
    return <FullPageLoading message="Loading profile..." />;
  }

  if (!currentUser && !isLoadingAuth && !isLoggingOut && !firebaseUser) {
     return <FullPageLoading message="Verifying session..." />;
  }

  const overallSubmitting = isFormSubmitting || isUploadingResume;

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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
             <div className="space-y-2">
                <Label htmlFor="countries">Target Countries (comma-separated)</Label>
                 <div className="relative flex items-center">
                    <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="countries" {...register('countries')} placeholder="e.g., US, CA, GB, India" className={`pl-10 ${errors.countries ? 'border-destructive' : ''}`} />
                </div>
                <p className="text-xs text-muted-foreground">Required. Enter country names or ISO alpha-2 codes (e.g., United States, CA). Helps in fetching relevant jobs.</p>
                {errors.countries && <p className="text-sm text-destructive">{errors.countries.message}</p>}
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
                    <Label htmlFor="resume-upload">Your Resume</Label>
                    <Input
                        id="resume-upload"
                        type="file"
                        onChange={handleResumeFileChange}
                        accept=".pdf,.doc,.docx"
                        className="mb-1 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                        disabled={isUploadingResume || overallSubmitting}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Optional. PDF or Word doc, max 5MB.</p>
                    {selectedResumeFile && !isUploadingResume && (
                        <p className="text-xs text-muted-foreground mt-1">Selected: {selectedResumeFile.name}. Ready to upload on save.</p>
                    )}
                     {currentResumeUrl && !selectedResumeFile && !isUploadingResume && (
                        <div className="mt-2 mb-2 flex items-center justify-between p-2 border rounded-md bg-muted/50">
                            <a href={currentResumeUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center truncate">
                                <Paperclip className="w-4 h-4 mr-2 shrink-0" />
                                <span className="truncate">{currentResumeUrl.split('/').pop()?.split('?')[0].substring(currentResumeUrl.lastIndexOf('_') + 1) || "View Current Resume"}</span>
                            </a>
                            <Button type="button" variant="ghost" size="icon" onClick={handleRemoveResume} className="h-7 w-7 text-destructive hover:bg-destructive/10" disabled={overallSubmitting}>
                                <XCircle className="w-4 h-4" />
                                <span className="sr-only">Remove resume</span>
                            </Button>
                        </div>
                    )}
                     {isUploadingResume && uploadResumeProgress !== null && (
                        <div className="mt-2">
                            <Progress value={uploadResumeProgress} className="w-full h-2" />
                            <p className="text-xs text-muted-foreground text-center mt-1">Uploading: {Math.round(uploadResumeProgress)}%</p>
                        </div>
                    )}
                    {errors.resume && <p className="text-sm text-destructive">{errors.resume.message}</p>}
                    <input type="hidden" {...register('resume')} />
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
              <Label htmlFor="desired_job_role" className="text-base">Ideal Job Role</Label>
              <Textarea
                id="desired_job_role"
                {...register('desired_job_role')}
                placeholder="e.g., Senior Frontend Developer specializing in e-commerce, interested in mid-size tech companies..."
                rows={5}
                className={errors.desired_job_role ? 'border-destructive' : ''}
              />
              {errors.desired_job_role && <p className="text-sm text-destructive">{errors.desired_job_role.message}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label htmlFor="remote_preference">Remote Work Preference</Label>
                    <Controller
                        name="remote_preference"
                        control={control}
                        render={({ field }) => {
                            return (
                                <Select
                                    onValueChange={field.onChange}
                                    value={field.value ?? undefined}
                                    disabled={overallSubmitting}
                                >
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
                            );
                        }}
                    />
                    <p className="text-xs text-muted-foreground">Optional.</p>
                    {errors.remote_preference && <p className="text-sm text-destructive">{errors.remote_preference.message}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="expected_salary">Expected Salary (Numeric)</Label>
                     <div className="relative flex items-center">
                        <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input id="expected_salary" type="number" {...register('expected_salary')} placeholder="e.g., 120000" className={`pl-10 ${errors.expected_salary ? 'border-destructive' : ''}`} disabled={overallSubmitting}/>
                    </div>
                    <p className="text-xs text-muted-foreground">Optional. Enter as a number (e.g., 120000 for $120,000).</p>
                    {errors.expected_salary && <p className="text-sm text-destructive">{errors.expected_salary.message}</p>}
                </div>
            </div>
          </CardContent>
          <CardFooter className="flex-col items-start gap-4 sm:flex-row sm:justify-between sm:items-center pt-6 border-t">
            <Button type="submit" disabled={overallSubmitting} size="lg" className="shadow-md hover:shadow-lg transition-shadow">
              {isUploadingResume ? <UploadCloud className="mr-2 h-4 w-4 animate-pulse" /> : (isFormSubmitting ? <LoadingSpinner size={16} className="mr-2" /> : null)}
              {isUploadingResume ? 'Uploading Resume...' : (isFormSubmitting ? 'Saving Profile...' : 'Save Profile')}
              {!overallSubmitting && <Edit3 className="ml-2 h-4 w-4" />}
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

      {currentUser && (
        <>
            <Separator className="my-10" />
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="font-headline text-xl flex items-center">
                        <MessageSquare className="mr-2 h-6 w-6 text-primary" /> Site Feedback
                    </CardTitle>
                    <CardDescription>
                        Encountered an issue or have a suggestion for the profile page or the site in general?
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <FeedbackDialog
                        source="profile-page"
                        triggerButton={
                            <Button variant="outline" size="lg">
                                <MessageSquare className="mr-2 h-5 w-5" /> Share Your Feedback
                            </Button>
                        }
                    />
                </CardContent>
                 <CardFooter className="text-xs text-muted-foreground pt-4">
                    Your feedback helps us improve the platform.
                </CardFooter>
            </Card>
        </>
      )}


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
                  This action cannot be undone. This will permanently delete your account from our backend, Firebase Authentication, and attempt to remove your uploaded resume from Firebase Storage.
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
          Deleting your account will remove all your saved information and uploaded files.
        </CardFooter>
      </Card>

    </div>
  );
}

