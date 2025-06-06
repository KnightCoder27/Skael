
"use client";

import { useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import useLocalStorage from '@/hooks/use-local-storage';
import type { User } from '@/types'; // Changed from UserProfileData
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { User as UserIcon, Edit3, FileText, Wand2 } from 'lucide-react'; // Renamed User to UserIcon to avoid conflict

// Schema updated to align with User type fields
const profileSchema = z.object({
  user_name: z.string().min(2, 'Name should be at least 2 characters.').max(50, 'Name cannot exceed 50 characters.').optional(),
  email_id: z.string().email('Invalid email address.'),
  location_string: z.string().optional(), // For simple text input, maps to User.location_string
  professional_summary: z.string().min(50, 'Profile text (resume/summary) should be at least 50 characters.').optional(),
  desired_job_role: z.string().min(10, 'Job preferences should be at least 10 characters.').optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const [userProfile, setUserProfile] = useLocalStorage<User | null>('user-profile', null);
  const { toast } = useToast();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      user_name: '',
      email_id: '',
      location_string: '',
      professional_summary: '',
      desired_job_role: '',
    },
  });
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = form;

  useEffect(() => {
    if (userProfile) {
      reset({
        user_name: userProfile.user_name || '',
        email_id: userProfile.email_id || '', // email_id is mandatory in User type
        location_string: userProfile.location_string || '',
        professional_summary: userProfile.professional_summary || '',
        desired_job_role: userProfile.desired_job_role || '',
      });
    }
  }, [userProfile, reset]);

  const onSubmit: SubmitHandler<ProfileFormValues> = (data) => {
    // When saving, merge with existing profile to preserve other fields like id, skills, etc.
    setUserProfile(prevProfile => ({
      ...(prevProfile || { id: Date.now(), email_id: data.email_id }), // Ensure id and email_id are present
      ...data, 
    }));
    toast({
      title: 'Profile Updated',
      description: 'Your profile information has been saved successfully.',
    });
  };
  
  const handleGenerateGeneralResume = () => {
    toast({ title: "Coming Soon!", description: "General resume generation will be available soon." });
    console.log("Generate General Resume based on profile:", userProfile);
  };

  const handleGenerateCustomCoverLetter = () => {
    toast({ title: "Coming Soon!", description: "Custom cover letter generation will be available soon." });
    console.log("Generate Custom Cover Letter: User would paste JD here.");
  };

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
              Basic information about you. Email is used for account purposes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="user_name">Full Name</Label>
                <Input id="user_name" {...register('user_name')} placeholder="Your Full Name" className={errors.user_name ? 'border-destructive' : ''} />
                {errors.user_name && <p className="text-sm text-destructive">{errors.user_name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email_id">Email Address</Label>
                <Input id="email_id" type="email" {...register('email_id')} placeholder="you@example.com" className={errors.email_id ? 'border-destructive' : ''} />
                {errors.email_id && <p className="text-sm text-destructive">{errors.email_id.message}</p>}
              </div>
            </div>
             <div className="space-y-2">
              <Label htmlFor="location_string">Location (Optional)</Label>
              <Input id="location_string" {...register('location_string')} placeholder="e.g., San Francisco, CA or Remote" className={errors.location_string ? 'border-destructive' : ''} />
              {errors.location_string && <p className="text-sm text-destructive">{errors.location_string.message}</p>}
            </div>
          </CardContent>

          <Separator className="my-6" />

          <CardHeader>
            <CardTitle className="font-headline text-xl">Professional Summary & Resume</CardTitle>
            <CardDescription>
              Paste your resume or LinkedIn profile summary. This is crucial for AI matching.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="professional_summary" className="text-base">Profile Text (Resume/LinkedIn Summary)</Label>
              <Textarea
                id="professional_summary"
                {...register('professional_summary')}
                placeholder="Paste your full resume or a detailed LinkedIn profile summary here..."
                rows={15}
                className={errors.professional_summary ? 'border-destructive' : ''}
              />
              {errors.professional_summary && <p className="text-sm text-destructive">{errors.professional_summary.message}</p>}
            </div>
          </CardContent>
          
          <Separator className="my-6" />

          <CardHeader>
            <CardTitle className="font-headline text-xl">Job Preferences</CardTitle>
            <CardDescription>
              Describe your ideal role, desired location, salary expectations, preferred technologies, etc.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="desired_job_role" className="text-base">My Ideal Job Role & Preferences</Label>
              <Textarea
                id="desired_job_role"
                {...register('desired_job_role')}
                placeholder="e.g., Looking for remote frontend developer roles, interested in startups, target salary $120k+, preferred technologies: React, Next.js..."
                rows={5}
                className={errors.desired_job_role ? 'border-destructive' : ''}
              />
              {errors.desired_job_role && <p className="text-sm text-destructive">{errors.desired_job_role.message}</p>}
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
            Generate general application materials based on your saved profile or for any job description.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-0 sm:flex sm:gap-4">
          <Button onClick={handleGenerateGeneralResume} variant="outline" size="lg" className="w-full sm:w-auto">
            <FileText className="mr-2 h-5 w-5" /> Generate General Resume
          </Button>
          <Button onClick={handleGenerateCustomCoverLetter} variant="outline" size="lg" className="w-full sm:w-auto">
            <FileText className="mr-2 h-5 w-5" /> Generate Cover Letter for any JD
          </Button>
        </CardContent>
         <CardFooter className="text-xs text-muted-foreground pt-4">
          These tools use your saved profile information. Ensure your profile is up-to-date for best results.
        </CardFooter>
      </Card>
    </div>
  );
}
