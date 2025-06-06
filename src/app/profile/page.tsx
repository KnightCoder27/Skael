
"use client";

import { useEffect } from 'react';
import { useForm, type SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import useLocalStorage from '@/hooks/use-local-storage';
import type { User, RemotePreference } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { User as UserIcon, Edit3, FileText, Wand2, Phone, Briefcase, DollarSign, CloudSun, BookUser, ListChecks, MapPin, Globe } from 'lucide-react';

const remotePreferenceOptions: RemotePreference[] = ["Remote", "Hybrid", "Onsite", "Flexible"];

const profileSchema = z.object({
  user_name: z.string().min(2, 'Name should be at least 2 characters.').max(50, 'Name cannot exceed 50 characters.').optional(),
  email_id: z.string().email('Invalid email address.'), 
  phone_number: z.string().max(20, 'Phone number cannot exceed 20 characters.').optional().or(z.literal('')), 
  location_string: z.string().max(255, 'Locations cannot exceed 255 characters.').optional().or(z.literal('')),
  country: z.string().max(100, 'Country cannot exceed 100 characters.').optional().or(z.literal('')),
  professional_summary: z.string().min(50, 'Profile summary should be at least 50 characters.').optional().or(z.literal('')),
  desired_job_role: z.string().min(10, 'Job preferences should be at least 10 characters.').optional().or(z.literal('')),
  experience: z.coerce.number().int().nonnegative('Experience must be a positive number.').optional().nullable(), 
  remote_preference: z.enum(["Remote", "Hybrid", "Onsite", "Flexible"]).optional(),
  expected_salary: z.string().max(50, 'Expected salary cannot exceed 50 characters.').optional().or(z.literal('')), 
  skills_list_text: z.string().max(500, 'Skills list cannot exceed 500 characters.').optional().or(z.literal('')), 
  resume: z.string().url('Please enter a valid URL for your resume.').max(255, 'Resume URL cannot exceed 255 characters.').optional().or(z.literal('')),
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
      phone_number: '',
      location_string: '',
      country: '',
      professional_summary: '',
      desired_job_role: '',
      experience: undefined, 
      remote_preference: undefined,
      expected_salary: '',
      skills_list_text: '',
      resume: '',
    },
  });
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset, control } = form;

  useEffect(() => {
    if (userProfile) {
      reset({
        user_name: userProfile.user_name || '',
        email_id: userProfile.email_id || '',
        phone_number: userProfile.phone_number || '',
        location_string: userProfile.location_string || '',
        country: userProfile.country || '',
        professional_summary: userProfile.professional_summary || '',
        desired_job_role: userProfile.desired_job_role || '',
        experience: userProfile.experience ?? undefined, 
        remote_preference: userProfile.remote_preference,
        expected_salary: userProfile.expected_salary || '',
        skills_list_text: userProfile.skills_list_text || '',
        resume: userProfile.resume || '',
      });
    }
  }, [userProfile, reset]);

  const onSubmit: SubmitHandler<ProfileFormValues> = (data) => {
    setUserProfile(prevProfile => ({
      ...(prevProfile || { id: Date.now(), email_id: data.email_id }), 
      ...data,
      experience: data.experience === null ? undefined : data.experience, 
    }));
    toast({
      title: 'Profile Updated',
      description: 'Your profile information has been saved successfully.',
    });
  };
  
  const handleGenerateGeneralResume = () => {
    toast({ title: "Coming Soon!", description: "General resume generation will be available soon." });
  };

  const handleGenerateCustomCoverLetter = () => {
    toast({ title: "Coming Soon!", description: "Custom cover letter generation will be available soon." });
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
              Basic information about you. Your email is used for account identity.
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
                <Input id="email_id" type="email" {...register('email_id')} placeholder="you@example.com" className={errors.email_id ? 'border-destructive' : ''} readOnly={!!userProfile?.email_id} />
                {errors.email_id && <p className="text-sm text-destructive">{errors.email_id.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="phone_number">Phone Number (Optional)</Label>
                <div className="relative flex items-center">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="phone_number" type="tel" {...register('phone_number')} placeholder="(123) 456-7890" className={`pl-10 ${errors.phone_number ? 'border-destructive' : ''}`} />
                </div>
                {errors.phone_number && <p className="text-sm text-destructive">{errors.phone_number.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country (Optional)</Label>
                <div className="relative flex items-center">
                    <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="country" {...register('country')} placeholder="e.g., United States" className={`pl-10 ${errors.country ? 'border-destructive' : ''}`} />
                </div>
                {errors.country && <p className="text-sm text-destructive">{errors.country.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="location_string">Preferred Locations (Optional)</Label>
                 <div className="relative flex items-center">
                    <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="location_string" {...register('location_string')} placeholder="e.g., New York, Remote, London" className={`pl-10 ${errors.location_string ? 'border-destructive' : ''}`} />
                </div>
                <p className="text-xs text-muted-foreground">Enter cities or "Remote", separated by commas.</p>
                {errors.location_string && <p className="text-sm text-destructive">{errors.location_string.message}</p>}
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
              <Label htmlFor="professional_summary" className="text-base flex items-center"><BookUser className="mr-2 h-5 w-5 text-primary/80"/>Professional Summary / Resume Text</Label>
              <Textarea
                id="professional_summary"
                {...register('professional_summary')}
                placeholder="Paste your full resume text or a detailed LinkedIn profile summary here. The more detail, the better the AI matching!"
                rows={15}
                className={errors.professional_summary ? 'border-destructive' : ''}
              />
              {errors.professional_summary && <p className="text-sm text-destructive">{errors.professional_summary.message}</p>}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label htmlFor="experience">Years of Professional Experience (Optional)</Label>
                    <div className="relative flex items-center">
                        <Briefcase className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input id="experience" type="number" {...register('experience')} placeholder="e.g., 5" className={`pl-10 ${errors.experience ? 'border-destructive' : ''}`} />
                    </div>
                    {errors.experience && <p className="text-sm text-destructive">{errors.experience.message}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="resume">Resume URL (Optional)</Label>
                     <div className="relative flex items-center">
                        <FileText className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input id="resume" {...register('resume')} placeholder="https://example.com/your-resume.pdf" className={`pl-10 ${errors.resume ? 'border-destructive' : ''}`} />
                    </div>
                    {errors.resume && <p className="text-sm text-destructive">{errors.resume.message}</p>}
                </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="skills_list_text" className="text-base flex items-center"><ListChecks className="mr-2 h-5 w-5 text-primary/80"/>Key Skills (Comma-separated, Optional)</Label>
              <Textarea
                id="skills_list_text"
                {...register('skills_list_text')}
                placeholder="e.g., React, Node.js, Python, Project Management, UI/UX Design"
                rows={3}
                className={errors.skills_list_text ? 'border-destructive' : ''}
              />
              <p className="text-xs text-muted-foreground">Enter skills separated by commas. This helps AI find relevant jobs.</p>
              {errors.skills_list_text && <p className="text-sm text-destructive">{errors.skills_list_text.message}</p>}
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
              <Label htmlFor="desired_job_role" className="text-base">My Ideal Job Role & Preferences</Label>
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
                    <Label htmlFor="remote_preference">Remote Work Preference (Optional)</Label>
                    <Controller
                        name="remote_preference"
                        control={control}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger className={`relative ${errors.remote_preference ? 'border-destructive' : ''}`}>
                                     <CloudSun className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <span className="pl-10">
                                        <SelectValue placeholder="Select preference" />
                                    </span>
                                </SelectTrigger>
                                <SelectContent>
                                    {remotePreferenceOptions.map(option => (
                                        <SelectItem key={option} value={option}>{option}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    />
                    {errors.remote_preference && <p className="text-sm text-destructive">{errors.remote_preference.message}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="expected_salary">Expected Salary (Optional)</Label>
                     <div className="relative flex items-center">
                        <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input id="expected_salary" {...register('expected_salary')} placeholder="e.g., $120,000 USD or 90K EUR" className={`pl-10 ${errors.expected_salary ? 'border-destructive' : ''}`} />
                    </div>
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
