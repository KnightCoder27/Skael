
"use client";

import { useEffect, useState, ChangeEvent } from 'react';
import { useForm, type SubmitHandler, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import type { User, UserUpdateAPI, RemotePreferenceAPI, UserModifyResponse, WorkExperienceItem, EducationItem, CertificationItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { User as UserIcon, Edit3, FileText, Wand2, Phone, Briefcase, DollarSign, CloudSun, BookUser, ListChecks, MapPin, Globe, Trash2, AlertTriangle, LogOut as LogOutIcon, MessageSquare, UploadCloud, Paperclip, XCircle, GraduationCap, Award, PlusCircle, Building, School, ScrollText, CalendarIcon, Edit, Check, X } from 'lucide-react';
import { FullPageLoading, LoadingSpinner } from '@/components/app/loading-spinner';
import apiClient from '@/lib/apiClient';
import { auth as firebaseAuth, storage } from '@/lib/firebase';
import { deleteUser as deleteFirebaseUser, type User as FirebaseUser } from 'firebase/auth';
import { ref as storageRef, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { AxiosError } from 'axios';
import { FeedbackDialog } from '@/components/app/feedback-dialog';
import { Progress } from '@/components/ui/progress';
import { format, parseISO, isValid } from 'date-fns';
import { cn } from '@/lib/utils';

const remotePreferenceOptions: RemotePreferenceAPI[] = ["Remote", "Hybrid", "Onsite"];
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const dateErrorMessage = "Date must be in YYYY-MM-DD format.";

const workExperienceSchema = z.object({
  id: z.string().optional(),
  company_name: z.string().min(1, "Company name is required."),
  job_title: z.string().min(1, "Job title is required."),
  start_date: z.string().min(1, "Start date is required.").regex(dateRegex, dateErrorMessage),
  end_date: z.string().regex(dateRegex, dateErrorMessage).optional().nullable(),
  description: z.string().max(1000, "Description max 1000 chars.").optional().nullable().transform(val => (val === "" ? null : val)),
  currently_working: z.boolean().optional(),
}).refine(data => {
  if (data.currently_working) return true;
  return !!data.end_date;
}, {
  message: "End date is required if not currently working here.",
  path: ["end_date"],
}).refine(data => {
  if (data.start_date && data.end_date && !data.currently_working) {
    if (dateRegex.test(data.start_date) && dateRegex.test(data.end_date)) {
      try { return parseISO(data.end_date) >= parseISO(data.start_date); } catch (e) { return false; }
    }
    return true;
  }
  return true;
}, {
  message: "End date cannot be before start date.",
  path: ["end_date"],
});

const educationSchema = z.object({
  id: z.string().optional(),
  institution: z.string().min(1, "Institution name is required."),
  degree: z.string().min(1, "Degree is required."),
  start_year: z.coerce.number().int("Year must be a whole number.").min(1900, "Invalid year").max(new Date().getFullYear() + 10, "Invalid year").optional().nullable(),
  end_year: z.coerce.number().int("Year must be a whole number.").min(1900, "Invalid year").max(new Date().getFullYear() + 15, "Invalid year").optional().nullable(),
  currently_studying: z.boolean().optional(),
}).refine(data => {
  if (data.currently_studying) return true;
  // End year is optional if not currently studying, validation for it being present can be added if business logic requires
  return true; 
}).refine(data => {
  if (data.start_year && data.end_year && !data.currently_studying) {
    return data.end_year >= data.start_year;
  }
  return true;
}, {
  message: "End year cannot be before start year.",
  path: ["end_year"],
});

const certificationSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Certification title is required."),
  issued_by: z.string().optional().nullable().transform(val => (val === "" ? null : val)),
  issue_date: z.string().regex(dateRegex, dateErrorMessage).optional().nullable(),
  credential_url: z.string().url("Must be a valid URL.")
    .or(z.literal("").transform(() => null)) 
    .optional()
    .nullable(),
});

const profileSchema = z.object({
  username: z.string().min(2, 'Name should be at least 2 characters.').max(50, 'Name cannot exceed 50 characters.'),
  email_id: z.string().email('Invalid email address.'),
  phone_number: z.string().max(20, 'Phone number cannot exceed 20 characters.').optional().nullable().transform(val => (val === "" ? null : val)),
  professional_summary: z.string().min(50, 'Profile summary should be at least 50 characters.').optional().nullable().transform(val => (val === "" ? null : val)),
  desired_job_role: z.string().min(10, 'Ideal Job Role should be at least 10 characters.').optional().nullable().transform(val => (val === "" ? null : val)),
  skills: z.string().max(500, 'Skills list cannot exceed 500 characters (comma-separated).').optional().nullable().transform(val => (val === "" ? null : val)),
  experience: z.coerce.number().int().nonnegative('Experience must be a positive number.').optional().nullable(),
  preferred_locations: z.string().max(255, 'Preferred Locations cannot exceed 255 characters (comma-separated).').optional().nullable().transform(val => (val === "" ? null : val)),
  countries: z.string().min(1, 'Countries are required. Enter names or ISO alpha-2 codes (e.g., United States, CA).').max(255, 'Countries list cannot exceed 255 characters (comma-separated).'),
  remote_preference: z.enum(remotePreferenceOptions, { errorMap: () => ({ message: "Please select a valid remote preference."}) }).optional().nullable(),
  expected_salary: z.coerce.number().positive("Expected salary must be a positive number.").optional().nullable(),
  resume: z.string().url('Resume must be a valid URL (this will be the Firebase Storage URL).').max(1024, 'Resume URL too long.').optional().nullable(),
  work_experiences: z.array(workExperienceSchema).optional().nullable(),
  educations: z.array(educationSchema).optional().nullable(),
  certifications: z.array(certificationSchema).optional().nullable(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;
type EditableSection = 'work_experiences' | 'educations' | 'certifications' | null;

const getErrorMessage = (error: any): string => {
  if (error instanceof AxiosError && error.response) {
    const detail = error.response.data?.detail;
    const messages = error.response.data?.messages;
    if (typeof detail === 'object' && detail !== null) {
      return JSON.stringify(detail);
    }
    if (detail) { return typeof detail === 'string' ? detail : String(detail); }
    if (typeof messages === 'object' && messages !== null) {
      return JSON.stringify(messages);
    }
    if (messages) { return typeof messages === 'string' ? messages : String(messages); }
    return `Request failed with status code ${error.response.status}`;
  } else if (error instanceof Error) {
    return error.message;
  }
  return "An unexpected error occurred.";
};

const currentYear = new Date().getFullYear();
const calendarFromYear = currentYear - 100;
const calendarToYear = currentYear + 10;

export default function ProfilePage() {
  const { currentUser, firebaseUser, isLoadingAuth, backendUserId, setBackendUser, refetchBackendUser, isLoggingOut, setIsLoggingOut } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [selectedResumeFile, setSelectedResumeFile] = useState<File | null>(null);
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [uploadResumeProgress, setUploadResumeProgress] = useState<number | null>(null);
  const [currentResumeUrl, setCurrentResumeUrl] = useState<string | null>(null);
  const [hasPopulatedFromCurrentUser, setHasPopulatedFromCurrentUser] = useState(false);
  const [editingSection, setEditingSection] = useState<EditableSection>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { /* Defaults set in useEffect */ }
  });
  const { register, handleSubmit, formState: { errors, isSubmitting: isFormSubmitting }, reset, control, setValue, watch, clearErrors } = form;

  const { fields: workFields, append: appendWork, remove: removeWork } = useFieldArray({ control, name: "work_experiences" });
  const { fields: eduFields, append: appendEdu, remove: removeEdu } = useFieldArray({ control, name: "educations" });
  const { fields: certFields, append: appendCert, remove: removeCert } = useFieldArray({ control, name: "certifications" });

  const watchedResumeUrl = watch("resume");

  useEffect(() => { setCurrentResumeUrl(watchedResumeUrl ?? null); }, [watchedResumeUrl]);

  useEffect(() => {
    if (isLoggingOut) return;
    if (!isLoadingAuth && !currentUser && !firebaseUser) {
      toast({ title: "Not Authenticated", description: "Please log in to view your profile.", variant: "destructive" });
      router.push('/auth');
    }
  }, [isLoadingAuth, currentUser, firebaseUser, router, toast, isLoggingOut]);

  const mapDateToFormValue = (dateStr: string | undefined | null): string | null => {
    if (!dateStr) return null;
    try {
      const parsed = parseISO(dateStr);
      if (isValid(parsed)) {
        return format(parsed, 'yyyy-MM-dd');
      }
    } catch (e) { /* ignore, will return null */ }
    return null; 
  };
  
  const mapUserToFormValues = (user: User | null, fbUser: FirebaseUser | null): ProfileFormValues => {
    const currentRPFromDBRaw: string | null | undefined = user?.remote_preference;
    let formRPValue: RemotePreferenceAPI | undefined = undefined;
    if (typeof currentRPFromDBRaw === 'string' && currentRPFromDBRaw.trim() !== '') {
      const normalizedRP = currentRPFromDBRaw.toLowerCase().trim();
      if (remotePreferenceOptions.includes(normalizedRP as RemotePreferenceAPI)) {
        formRPValue = normalizedRP as RemotePreferenceAPI;
      }
    }
    return {
      username: user?.username || fbUser?.displayName || '',
      email_id: user?.email_id || fbUser?.email || '',
      phone_number: user?.phone_number || null,
      professional_summary: user?.professional_summary || null,
      desired_job_role: user?.desired_job_role || null,
      skills: user?.skills?.join(', ') || null,
      experience: user?.experience ?? null,
      preferred_locations: user?.preferred_locations?.join(', ') || null,
      countries: user?.countries?.join(', ') || '',
      remote_preference: formRPValue,
      expected_salary: user?.expected_salary ?? null,
      resume: user?.resume || null,
      work_experiences: user?.work_experiences?.map(w => ({
        id: w.id || crypto.randomUUID(),
        company_name: w.company_name || '',
        job_title: w.job_title || '',
        start_date: mapDateToFormValue(w.start_date) || '',
        end_date: w.currently_working ? null : mapDateToFormValue(w.end_date),
        description: w.description || null,
        currently_working: w.currently_working ?? !w.end_date,
      })) || [],
      educations: user?.educations?.map(e => ({
        id: e.id || crypto.randomUUID(),
        institution: e.institution || '',
        degree: e.degree || '',
        start_year: typeof e.start_year === 'number' ? e.start_year : null,
        end_year: e.currently_studying ? null : (typeof e.end_year === 'number' ? e.end_year : null),
        currently_studying: e.currently_studying ?? !e.end_year,
      })) || [],
      certifications: user?.certifications?.map(c => ({
        id: c.id || crypto.randomUUID(),
        title: c.title || '',
        issued_by: c.issued_by || null,
        issue_date: mapDateToFormValue(c.issue_date),
        credential_url: c.credential_url || null,
      })) || [],
    };
  };

  useEffect(() => {
    if (isLoadingAuth || isLoggingOut) return;
    const formValues = mapUserToFormValues(currentUser, firebaseUser);
    reset(formValues);
    setCurrentResumeUrl(formValues.resume);
    setHasPopulatedFromCurrentUser(true);
  }, [currentUser, firebaseUser, reset, isLoadingAuth, isLoggingOut]);

  const handleCancelSectionEdit = (sectionName: 'work_experiences' | 'educations' | 'certifications') => {
    const originalSectionData = mapUserToFormValues(currentUser, firebaseUser)[sectionName];
    setValue(sectionName, originalSectionData as any, { shouldValidate: false, shouldDirty: false });
    setEditingSection(null);
  };

  const handleResumeFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "File Too Large", description: "Resume file should be less than 5MB.", variant: "destructive" });
        event.target.value = ''; return;
      }
      const allowedTypes = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
      if (!allowedTypes.includes(file.type)) {
        toast({ title: "Invalid File Type", description: "Please upload a PDF or Word document.", variant: "destructive" });
        event.target.value = ''; return;
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
        setValue('resume', null, { shouldValidate: true, shouldDirty: true });
        setCurrentResumeUrl(null); setSelectedResumeFile(null);
        await refetchBackendUser();
        toast({ title: "Resume Removed" });
      }
    } catch (error) { toast({ title: "Removal Failed", description: getErrorMessage(error), variant: "destructive" });
    } finally { setIsUploadingResume(false); }
  };

  const onSubmit: SubmitHandler<ProfileFormValues> = async (data) => {
    if (!backendUserId || !firebaseUser) {
      toast({ title: "Error", description: "User session not found.", variant: "destructive" }); return;
    }
    if (editingSection) {
      toast({ title: "Action Required", description: `Please "Done" or "Cancel" editing the ${editingSection.replace('_', ' ')} section before saving.`, variant: "destructive" });
      return;
    }

    let newResumeUrlFromUpload: string | undefined = undefined;
    let uploadSucceeded = false;

    if (selectedResumeFile && firebaseUser) {
      setIsUploadingResume(true); setUploadResumeProgress(0);
      const filePath = `users/${firebaseUser.uid}/uploaded_resumes/${Date.now()}_${selectedResumeFile.name}`;
      const fileStorageRef = storageRef(storage, filePath);
      const uploadTask = uploadBytesResumable(fileStorageRef, selectedResumeFile);
      
      try {
        if (currentResumeUrl) {
          try { await deleteObject(storageRef(storage, currentResumeUrl)); }
          catch (deleteError: any) { if (deleteError.code !== 'storage/object-not-found') console.warn("Could not delete old resume during update:", deleteError); }
        }
        await new Promise<void>((resolve, reject) => {
          uploadTask.on('state_changed', (snapshot) => setUploadResumeProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
            reject,
            async () => { try { newResumeUrlFromUpload = await getDownloadURL(uploadTask.snapshot.ref); uploadSucceeded = true; resolve(); } catch (getUrlError){ reject(getUrlError); } }
          );
        });
      } catch (error) { toast({ title: "Resume Upload Failed", description: `Profile not saved. ${getErrorMessage(error)}`, variant: "destructive" });
      } finally { setIsUploadingResume(false); setUploadResumeProgress(null); }
      
      if (!uploadSucceeded) return; // Important: Exit if upload failed
    } else {
      uploadSucceeded = true; // No upload attempted, so proceed
    }

    const finalResumeUrl = newResumeUrlFromUpload !== undefined ? newResumeUrlFromUpload : data.resume;

    const updatePayload: UserUpdateAPI = {
      username: data.username,
      number: data.phone_number || null,
      desired_job_role: data.desired_job_role || null,
      skills: data.skills || undefined,
      experience: data.experience ?? null,
      preferred_locations: data.preferred_locations || undefined,
      country: data.countries,
      remote_preference: data.remote_preference || null,
      professional_summary: data.professional_summary || null,
      expected_salary: data.expected_salary ?? null,
      resume: finalResumeUrl,
      work_experiences: data.work_experiences?.map(({id, currently_working, ...rest}) => ({
        ...rest, end_date: currently_working ? null : (rest.end_date || null),
      })) || [],
      educations: data.educations?.map(({id, currently_studying, ...rest}) => ({
        ...rest, 
        start_year: rest.start_year ? Number(rest.start_year) : null,
        end_year: currently_studying ? null : (rest.end_year ? Number(rest.end_year) : null),
      })) || [],
      certifications: data.certifications?.map(({id, ...rest}) => ({ ...rest })) || [],
    };
    const filteredPayload = Object.fromEntries( Object.entries(updatePayload).filter(([_, v]) => v !== undefined) ) as Partial<UserUpdateAPI>;

    try {
      const response = await apiClient.put<UserModifyResponse>(`/users/${backendUserId}`, filteredPayload);
      if (response.data.messages?.toLowerCase() === 'success') {
        await refetchBackendUser(); 
        setEditingSection(null); 
        setSelectedResumeFile(null); 
        toast({ title: 'Profile Updated Successfully' });
      } else { throw new Error(response.data.messages || "Backend issue."); }
    } catch (error) { toast({ title: "Update Failed", description: getErrorMessage(error), variant: "destructive" }); }
  };

  if (isLoggingOut) return <FullPageLoading message="Processing Account Deletion..." />;
  if (isLoadingAuth || !hasPopulatedFromCurrentUser) return <FullPageLoading message="Loading profile..." />;
  if (!currentUser && !isLoadingAuth && !isLoggingOut && !firebaseUser) return <FullPageLoading message="Verifying session..." />;

  const overallSubmitting = isFormSubmitting || isUploadingResume;
  
  const formatDateForDisplay = (dateInput: string | Date | undefined | null, displayFormat: string = 'MMM yyyy'): string => {
    if (!dateInput) return 'N/A';

    let dateObj: Date;
    if (typeof dateInput === 'string') {
      try {
        // Try to parse ISO string. parseISO is flexible.
        dateObj = parseISO(dateInput);
      } catch (e) {
        console.warn("Failed to parse date string for display:", dateInput, e);
        return dateInput; // Show original string if it was a string and failed to parse
      }
    } else if (dateInput instanceof Date) {
      dateObj = dateInput;
    } else {
      // This case should ideally not be hit if types are correct
      return 'Invalid Input Type';
    }

    if (isValid(dateObj)) {
      return format(dateObj, displayFormat);
    } else {
      // If dateInput was a string and resulted in Invalid Date, return the original string.
      // This helps debug by showing the problematic string as it was.
      // If it was already a Date object but invalid, then 'Invalid Date'.
      return typeof dateInput === 'string' ? dateInput : 'Invalid Date';
    }
  };

  const renderWorkExperiences = () => {
    if (editingSection === 'work_experiences') {
      return (
        <>
          {workFields.map((item, index) => {
            const currentlyWorking = watch(`work_experiences.${index}.currently_working`);
            return (
              <Card key={item.id} className="p-4 bg-muted/30 border-dashed mb-4">
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><Label htmlFor={`work_experiences.${index}.company_name`}>Company Name</Label><Input {...register(`work_experiences.${index}.company_name`)} placeholder="e.g., Acme Corp" className={errors.work_experiences?.[index]?.company_name ? 'border-destructive' : ''}/>{errors.work_experiences?.[index]?.company_name && <p className="text-sm text-destructive">{errors.work_experiences[index]?.company_name?.message}</p>}</div>
                    <div><Label htmlFor={`work_experiences.${index}.job_title`}>Job Title</Label><Input {...register(`work_experiences.${index}.job_title`)} placeholder="e.g., Software Engineer" className={errors.work_experiences?.[index]?.job_title ? 'border-destructive' : ''}/>{errors.work_experiences?.[index]?.job_title && <p className="text-sm text-destructive">{errors.work_experiences[index]?.job_title?.message}</p>}</div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                    <div><Label htmlFor={`work_experiences.${index}.start_date`}>Start Date</Label>
                      <Controller control={control} name={`work_experiences.${index}.start_date`} render={({ field }) => (
                        <Popover><PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground", errors.work_experiences?.[index]?.start_date && "border-destructive")}><CalendarIcon className="mr-2 h-4 w-4" />{field.value && isValid(parseISO(field.value)) ? format(parseISO(field.value), "PPP") : <span>Pick a date</span>}</Button></PopoverTrigger>
                          <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value && isValid(parseISO(field.value)) ? parseISO(field.value) : undefined} onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")} captionLayout="dropdown-buttons" fromYear={calendarFromYear} toYear={calendarToYear} initialFocus /></PopoverContent></Popover>)}/>
                      {errors.work_experiences?.[index]?.start_date && <p className="text-sm text-destructive">{errors.work_experiences[index]?.start_date?.message}</p>}</div>
                    <div><Label htmlFor={`work_experiences.${index}.end_date`}>End Date</Label>
                      <Controller control={control} name={`work_experiences.${index}.end_date`} render={({ field }) => (
                        <Popover><PopoverTrigger asChild><Button variant={"outline"} disabled={currentlyWorking} className={cn("w-full justify-start text-left font-normal", !field.value && !currentlyWorking && "text-muted-foreground", errors.work_experiences?.[index]?.end_date && !currentlyWorking && "border-destructive")}><CalendarIcon className="mr-2 h-4 w-4" />{field.value && !currentlyWorking && isValid(parseISO(field.value)) ? format(parseISO(field.value), "PPP") : <span>Pick a date</span>}</Button></PopoverTrigger>
                          <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value && isValid(parseISO(field.value)) ? parseISO(field.value) : undefined} onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : null)} captionLayout="dropdown-buttons" fromYear={calendarFromYear} toYear={calendarToYear} /></PopoverContent></Popover>)}/>
                      {errors.work_experiences?.[index]?.end_date && !currentlyWorking && <p className="text-sm text-destructive">{errors.work_experiences[index]?.end_date?.message}</p>}</div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Controller name={`work_experiences.${index}.currently_working`} control={control} render={({ field }) => (<Checkbox id={`work_exp_current_${index}`} checked={field.value} onCheckedChange={(checked) => { field.onChange(checked); if (checked) { setValue(`work_experiences.${index}.end_date`, null); clearErrors(`work_experiences.${index}.end_date`); } }}/>)}/>
                    <Label htmlFor={`work_exp_current_${index}`} className="text-sm font-normal">I currently work here</Label></div>
                  <div><Label htmlFor={`work_experiences.${index}.description`}>Description</Label><Textarea {...register(`work_experiences.${index}.description`)} placeholder="Key responsibilities..." rows={3} className={errors.work_experiences?.[index]?.description ? 'border-destructive' : ''}/>{errors.work_experiences?.[index]?.description && <p className="text-sm text-destructive">{errors.work_experiences[index]?.description?.message}</p>}</div>
                  <Button type="button" variant="outline" size="sm" onClick={() => removeWork(index)} className="text-destructive hover:bg-destructive/10"><Trash2 className="mr-2 h-3.5 w-3.5" /> Remove</Button>
                </div>
              </Card>
            );
          })}
          <Button type="button" variant="outline" onClick={() => appendWork({ id: crypto.randomUUID(), company_name: '', job_title: '', start_date: '', end_date: null, description: '', currently_working: false })}><PlusCircle className="mr-2 h-4 w-4" /> Add Work Experience</Button>
          <div className="flex gap-2 mt-4">
            <Button type="button" variant="default" onClick={() => setEditingSection(null)}><Check className="mr-2 h-4 w-4" /> Done</Button>
            <Button type="button" variant="ghost" onClick={() => handleCancelSectionEdit('work_experiences')}><X className="mr-2 h-4 w-4" /> Cancel</Button>
          </div>
        </>
      );
    }
    return (
      <div className="space-y-3">
        {currentUser?.work_experiences && currentUser.work_experiences.length > 0 ? (
          currentUser.work_experiences.map(exp => (
            <div key={exp.id || exp.company_name} className="p-3 border rounded-md bg-muted/20">
              <h4 className="font-semibold">{exp.job_title} at {exp.company_name}</h4>
              <p className="text-sm text-muted-foreground">
                {formatDateForDisplay(exp.start_date)} - {exp.currently_working ? 'Present' : formatDateForDisplay(exp.end_date)}
              </p>
              {exp.description && <p className="text-sm mt-1 whitespace-pre-line">{exp.description}</p>}
            </div>
          ))
        ) : <p className="text-sm text-muted-foreground">No work experience added yet.</p>}
        <Button type="button" variant="outline" onClick={() => setEditingSection('work_experiences')}><Edit className="mr-2 h-4 w-4" /> Edit Work Experience</Button>
      </div>
    );
  };

  const renderEducations = () => {
    if (editingSection === 'educations') {
      return (
        <>
          {eduFields.map((item, index) => {
            const currentlyStudying = watch(`educations.${index}.currently_studying`);
            return (
              <Card key={item.id} className="p-4 bg-muted/30 border-dashed mb-4">
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><Label htmlFor={`educations.${index}.institution`}>Institution</Label><Input {...register(`educations.${index}.institution`)} placeholder="e.g., University of Example" className={errors.educations?.[index]?.institution ? 'border-destructive' : ''}/>{errors.educations?.[index]?.institution && <p className="text-sm text-destructive">{errors.educations[index]?.institution?.message}</p>}</div>
                    <div><Label htmlFor={`educations.${index}.degree`}>Degree</Label><Input {...register(`educations.${index}.degree`)} placeholder="e.g., B.S. in Computer Science" className={errors.educations?.[index]?.degree ? 'border-destructive' : ''}/>{errors.educations?.[index]?.degree && <p className="text-sm text-destructive">{errors.educations[index]?.degree?.message}</p>}</div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                    <div><Label htmlFor={`educations.${index}.start_year`}>Start Year</Label><Input type="number" {...register(`educations.${index}.start_year`)} placeholder="YYYY" className={`hide-number-spinners ${errors.educations?.[index]?.start_year ? 'border-destructive' : ''}`}/>{errors.educations?.[index]?.start_year && <p className="text-sm text-destructive">{errors.educations[index]?.start_year?.message}</p>}</div>
                    <div><Label htmlFor={`educations.${index}.end_year`}>End Year</Label><Input type="number" {...register(`educations.${index}.end_year`)} placeholder="YYYY" disabled={currentlyStudying} className={`hide-number-spinners ${errors.educations?.[index]?.end_year && !currentlyStudying ? 'border-destructive' : ''}`}/>{errors.educations?.[index]?.end_year && !currentlyStudying && <p className="text-sm text-destructive">{errors.educations[index]?.end_year?.message}</p>}</div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Controller name={`educations.${index}.currently_studying`} control={control} render={({ field }) => (<Checkbox id={`edu_current_${index}`} checked={field.value} onCheckedChange={(checked) => { field.onChange(checked); if (checked) { setValue(`educations.${index}.end_year`, null); clearErrors(`educations.${index}.end_year`); } }}/>)}/>
                    <Label htmlFor={`edu_current_${index}`} className="text-sm font-normal">I am currently studying here</Label></div>
                  <Button type="button" variant="outline" size="sm" onClick={() => removeEdu(index)} className="text-destructive hover:bg-destructive/10"><Trash2 className="mr-2 h-3.5 w-3.5" /> Remove</Button>
                </div>
              </Card>
            );
          })}
          <Button type="button" variant="outline" onClick={() => appendEdu({ id: crypto.randomUUID(), institution: '', degree: '', start_year: null, end_year: null, currently_studying: false })}><PlusCircle className="mr-2 h-4 w-4" /> Add Education</Button>
          <div className="flex gap-2 mt-4">
            <Button type="button" variant="default" onClick={() => setEditingSection(null)}><Check className="mr-2 h-4 w-4" /> Done</Button>
            <Button type="button" variant="ghost" onClick={() => handleCancelSectionEdit('educations')}><X className="mr-2 h-4 w-4" /> Cancel</Button>
          </div>
        </>
      );
    }
    return (
      <div className="space-y-3">
        {currentUser?.educations && currentUser.educations.length > 0 ? (
          currentUser.educations.map(edu => (
            <div key={edu.id || edu.institution} className="p-3 border rounded-md bg-muted/20">
              <h4 className="font-semibold">{edu.degree} from {edu.institution}</h4>
              <p className="text-sm text-muted-foreground">
                {edu.start_year || 'N/A'} - {edu.currently_studying ? 'Present' : (edu.end_year || 'N/A')}
              </p>
            </div>
          ))
        ) : <p className="text-sm text-muted-foreground">No education added yet.</p>}
        <Button type="button" variant="outline" onClick={() => setEditingSection('educations')}><Edit className="mr-2 h-4 w-4" /> Edit Education</Button>
      </div>
    );
  };

  const renderCertifications = () => {
    if (editingSection === 'certifications') {
      return (
        <>
          {certFields.map((item, index) => (
            <Card key={item.id} className="p-4 bg-muted/30 border-dashed mb-4">
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><Label htmlFor={`certifications.${index}.title`}>Title</Label><Input {...register(`certifications.${index}.title`)} placeholder="e.g., AWS Certified" className={errors.certifications?.[index]?.title ? 'border-destructive' : ''}/>{errors.certifications?.[index]?.title && <p className="text-sm text-destructive">{errors.certifications[index]?.title?.message}</p>}</div>
                  <div><Label htmlFor={`certifications.${index}.issued_by`}>Issued By</Label><Input {...register(`certifications.${index}.issued_by`)} placeholder="e.g., Amazon Web Services" className={errors.certifications?.[index]?.issued_by ? 'border-destructive' : ''}/>{errors.certifications?.[index]?.issued_by && <p className="text-sm text-destructive">{errors.certifications[index]?.issued_by?.message}</p>}</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><Label htmlFor={`certifications.${index}.issue_date`}>Issue Date</Label>
                    <Controller control={control} name={`certifications.${index}.issue_date`} render={({ field }) => (
                      <Popover><PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground", errors.certifications?.[index]?.issue_date && "border-destructive")}><CalendarIcon className="mr-2 h-4 w-4" />{field.value && isValid(parseISO(field.value)) ? format(parseISO(field.value), "PPP") : <span>Pick a date</span>}</Button></PopoverTrigger>
                        <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value && isValid(parseISO(field.value)) ? parseISO(field.value) : undefined} onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : null)} captionLayout="dropdown-buttons" fromYear={calendarFromYear} toYear={calendarToYear} /></PopoverContent></Popover>)}/>
                    {errors.certifications?.[index]?.issue_date && <p className="text-sm text-destructive">{errors.certifications[index]?.issue_date?.message}</p>}</div>
                  <div><Label htmlFor={`certifications.${index}.credential_url`}>Credential URL</Label><Input {...register(`certifications.${index}.credential_url`)} placeholder="https://example.com/credential" className={errors.certifications?.[index]?.credential_url ? 'border-destructive' : ''}/>{errors.certifications?.[index]?.credential_url && <p className="text-sm text-destructive">{errors.certifications[index]?.credential_url?.message}</p>}</div>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => removeCert(index)} className="text-destructive hover:bg-destructive/10"><Trash2 className="mr-2 h-3.5 w-3.5" /> Remove</Button>
              </div>
            </Card>
          ))}
          <Button type="button" variant="outline" onClick={() => appendCert({id: crypto.randomUUID(), title: '', issued_by: '', issue_date: null, credential_url: '' })}><PlusCircle className="mr-2 h-4 w-4" /> Add Certification</Button>
          <div className="flex gap-2 mt-4">
            <Button type="button" variant="default" onClick={() => setEditingSection(null)}><Check className="mr-2 h-4 w-4" /> Done</Button>
            <Button type="button" variant="ghost" onClick={() => handleCancelSectionEdit('certifications')}><X className="mr-2 h-4 w-4" /> Cancel</Button>
          </div>
        </>
      );
    }
    return (
      <div className="space-y-3">
        {currentUser?.certifications && currentUser.certifications.length > 0 ? (
          currentUser.certifications.map(cert => (
            <div key={cert.id || cert.title} className="p-3 border rounded-md bg-muted/20">
              <h4 className="font-semibold">{cert.title}</h4>
              {cert.issued_by && <p className="text-sm text-muted-foreground">Issued by: {cert.issued_by}</p>}
              {cert.issue_date && <p className="text-sm text-muted-foreground">Issued: {formatDateForDisplay(cert.issue_date)}</p>}
              {cert.credential_url && <a href={cert.credential_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">View Credential</a>}
            </div>
          ))
        ) : <p className="text-sm text-muted-foreground">No certifications added yet.</p>}
        <Button type="button" variant="outline" onClick={() => setEditingSection('certifications')}><Edit className="mr-2 h-4 w-4" /> Edit Certifications</Button>
      </div>
    );
  };


  return (
    <div className="space-y-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold font-headline flex items-center"><UserIcon className="mr-3 h-8 w-8 text-primary" />My Profile</h1>
        <p className="text-muted-foreground">Keep your profile and job preferences up-to-date for the best job matches.</p>
      </header>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card className="shadow-lg">
            <CardHeader><CardTitle className="font-headline text-xl">Personal & Contact Information</CardTitle><CardDescription>Basic information about you. Your email is used for account identity.</CardDescription></CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2 md:max-w-md"><Label htmlFor="username">Full Name</Label><Input id="username" {...register('username')} placeholder="Your Full Name" className={`${errors.username ? 'border-destructive' : ''}`} />{errors.username && <p className="text-sm text-destructive">{errors.username.message}</p>}</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2"><Label htmlFor="email_id">Email Address</Label><Input id="email_id" type="email" {...register('email_id')} placeholder="you@example.com" className={errors.email_id ? 'border-destructive' : ''} readOnly />{errors.email_id && <p className="text-sm text-destructive">{errors.email_id.message}</p>}</div>
                <div className="space-y-2"><Label htmlFor="phone_number">Phone Number</Label><div className="relative flex items-center"><Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="phone_number" type="tel" {...register('phone_number')} placeholder="(123) 456-7890" className={`pl-10 ${errors.phone_number ? 'border-destructive' : ''}`} /></div><p className="text-xs text-muted-foreground">Optional.</p>{errors.phone_number && <p className="text-sm text-destructive">{errors.phone_number.message}</p>}</div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2"><Label htmlFor="preferred_locations">Preferred Locations (comma-separated)</Label><div className="relative flex items-center"><MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="preferred_locations" {...register('preferred_locations')} placeholder="e.g., New York, Remote, London" className={`pl-10 ${errors.preferred_locations ? 'border-destructive' : ''}`} /></div><p className="text-xs text-muted-foreground">Optional. Enter cities or "Remote".</p>{errors.preferred_locations && <p className="text-sm text-destructive">{errors.preferred_locations.message}</p>}</div>
                <div className="space-y-2"><Label htmlFor="countries">Target Countries (comma-separated)</Label><div className="relative flex items-center"><Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="countries" {...register('countries')} placeholder="e.g., US, CA, GB, India" className={`pl-10 ${errors.countries ? 'border-destructive' : ''}`} /></div><p className="text-xs text-muted-foreground">Required. Helps in fetching relevant jobs.</p>{errors.countries && <p className="text-sm text-destructive">{errors.countries.message}</p>}</div>
              </div>
            </CardContent>
        </Card>
        <Separator className="my-6" />
        <Card className="shadow-lg">
            <CardHeader><CardTitle className="font-headline text-xl">Professional Background</CardTitle><CardDescription>Your experience, skills, and resume summary are crucial for AI matching.</CardDescription></CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2"><Label htmlFor="professional_summary" className="text-base flex items-center"><BookUser className="mr-2 h-5 w-5 text-primary/80"/>Professional Summary</Label><Textarea id="professional_summary" {...register('professional_summary')} placeholder="A detailed summary..." rows={8} className={errors.professional_summary ? 'border-destructive' : ''} /><p className="text-xs text-muted-foreground">Optional. Min 50 chars if provided.</p>{errors.professional_summary && <p className="text-sm text-destructive">{errors.professional_summary.message}</p>}</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2"><Label htmlFor="experience">Years of Professional Experience</Label><div className="relative flex items-center"><Briefcase className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="experience" type="number" {...register('experience')} placeholder="e.g., 5" className={`pl-10 ${errors.experience ? 'border-destructive' : ''}`} /></div><p className="text-xs text-muted-foreground">Optional.</p>{errors.experience && <p className="text-sm text-destructive">{errors.experience.message}</p>}</div>
                  <div className="space-y-2"><Label htmlFor="resume-upload">Your Resume</Label><Input id="resume-upload" type="file" onChange={handleResumeFileChange} accept=".pdf,.doc,.docx" className="mb-1 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20" disabled={isUploadingResume || overallSubmitting}/><p className="text-xs text-muted-foreground mt-1">Optional. PDF or Word, max 5MB.</p>{selectedResumeFile && !isUploadingResume && (<p className="text-xs text-muted-foreground mt-1">Selected: {selectedResumeFile.name}</p>)}{currentResumeUrl && !selectedResumeFile && !isUploadingResume && (<div className="mt-2 mb-2 flex items-center justify-between p-2 border rounded-md bg-muted/50"><a href={currentResumeUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center truncate"><Paperclip className="w-4 h-4 mr-2 shrink-0" /><span className="truncate">{currentResumeUrl.split('/').pop()?.split('?')[0].substring(currentResumeUrl.lastIndexOf('_') + 1) || "View Current"}</span></a><Button type="button" variant="ghost" size="icon" onClick={handleRemoveResume} className="h-7 w-7 text-destructive hover:bg-destructive/10" disabled={overallSubmitting || isUploadingResume}><XCircle className="w-4 h-4" /></Button></div>)}{isUploadingResume && uploadResumeProgress !== null && (<div className="mt-2"><Progress value={uploadResumeProgress} className="w-full h-2" /><p className="text-xs text-muted-foreground text-center mt-1">Uploading: {Math.round(uploadResumeProgress)}%</p></div>)}{errors.resume && <p className="text-sm text-destructive">{errors.resume.message}</p>}<input type="hidden" {...register('resume')} /></div>
              </div>
              <div className="space-y-2"><Label htmlFor="skills" className="text-base flex items-center"><ListChecks className="mr-2 h-5 w-5 text-primary/80"/>Key Skills (comma-separated)</Label><Textarea id="skills" {...register('skills')} placeholder="e.g., React, Node.js, Python" rows={3} className={errors.skills ? 'border-destructive' : ''} /><p className="text-xs text-muted-foreground">Optional. Helps AI find relevant jobs.</p>{errors.skills && <p className="text-sm text-destructive">{errors.skills.message}</p>}</div>
            </CardContent>
        </Card>
        <Separator className="my-6" />
        <Card className="shadow-lg">
            <CardHeader><CardTitle className="font-headline text-xl">Job Preferences</CardTitle><CardDescription>Tailor job suggestions to your ideal role.</CardDescription></CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2"><Label htmlFor="desired_job_role" className="text-base">Ideal Job Role</Label><Textarea id="desired_job_role" {...register('desired_job_role')} placeholder="e.g., Senior Frontend Developer..." rows={5} className={errors.desired_job_role ? 'border-destructive' : ''} /><p className="text-xs text-muted-foreground">Optional. Min 10 chars if provided.</p>{errors.desired_job_role && <p className="text-sm text-destructive">{errors.desired_job_role.message}</p>}</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2"><Label htmlFor="remote_preference">Remote Work Preference</Label><Controller name="remote_preference" control={control} render={({ field }) => (<Select onValueChange={field.onChange} value={field.value ?? undefined} disabled={overallSubmitting}><SelectTrigger className={`relative w-full justify-start pl-10 pr-3 ${errors.remote_preference ? 'border-destructive' : ''}`}><CloudSun className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><SelectValue placeholder="Select preference" /></SelectTrigger><SelectContent>{remotePreferenceOptions.map(option => (<SelectItem key={option} value={option}>{option}</SelectItem>))}</SelectContent></Select>)}/><p className="text-xs text-muted-foreground">Optional.</p>{errors.remote_preference && <p className="text-sm text-destructive">{errors.remote_preference.message}</p>}</div>
                  <div className="space-y-2"><Label htmlFor="expected_salary">Expected Salary (Numeric)</Label><div className="relative flex items-center"><DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="expected_salary" type="number" {...register('expected_salary')} placeholder="e.g., 120000" className={`pl-10 ${errors.expected_salary ? 'border-destructive' : ''}`} disabled={overallSubmitting}/></div><p className="text-xs text-muted-foreground">Optional. Enter as a number.</p>{errors.expected_salary && <p className="text-sm text-destructive">{errors.expected_salary.message}</p>}</div>
              </div>
            </CardContent>
        </Card>
        <Separator className="my-6" />

        <Card className="shadow-lg">
          <CardHeader><CardTitle className="font-headline text-xl flex items-center"><Building className="mr-2 h-5 w-5 text-primary" />Work Experience</CardTitle><CardDescription>Detail your professional roles.</CardDescription></CardHeader>
          <CardContent>{renderWorkExperiences()}</CardContent>
        </Card>
        <Separator className="my-6" />
        <Card className="shadow-lg">
          <CardHeader><CardTitle className="font-headline text-xl flex items-center"><School className="mr-2 h-5 w-5 text-primary" />Education</CardTitle><CardDescription>List your academic qualifications.</CardDescription></CardHeader>
          <CardContent>{renderEducations()}</CardContent>
        </Card>
        <Separator className="my-6" />
        <Card className="shadow-lg">
          <CardHeader><CardTitle className="font-headline text-xl flex items-center"><Award className="mr-2 h-5 w-5 text-primary" />Certifications & Licenses</CardTitle><CardDescription>Include professional certifications.</CardDescription></CardHeader>
          <CardContent>{renderCertifications()}</CardContent>
        </Card>
        
        <div className="mt-8 flex justify-start">
            <Button type="submit" disabled={overallSubmitting || !!editingSection} size="lg" className="shadow-md hover:shadow-lg transition-shadow">
                {isUploadingResume ? <UploadCloud className="mr-2 h-4 w-4 animate-pulse" /> : (isFormSubmitting ? <LoadingSpinner size={16} className="mr-2" /> : null)}
                {isUploadingResume ? 'Uploading Resume...' : (isFormSubmitting ? 'Saving Profile...' : 'Save Profile')}
                {!overallSubmitting && !editingSection && <Edit3 className="ml-2 h-4 w-4" />}
            </Button>
        </div>
        {editingSection && <p className="text-sm text-destructive mt-2">Please click "Done" or "Cancel" in the section you are currently editing before saving the entire profile.</p>}
      </form>

      <Separator className="my-10" />
      <Card className="shadow-lg">
        <CardHeader><CardTitle className="font-headline text-xl flex items-center"><Wand2 className="mr-2 h-6 w-6 text-primary" /> Global AI Document Tools</CardTitle><CardDescription>Generate general application materials. (Functionality to be connected)</CardDescription></CardHeader>
        <CardContent className="space-y-4 sm:space-y-0 sm:flex sm:gap-4">
          <Button onClick={() => toast({ title: "Coming Soon!"})} variant="outline" size="lg" className="w-full sm:w-auto" disabled><FileText className="mr-2 h-5 w-5" /> Generate General Resume</Button>
          <Button onClick={() => toast({ title: "Coming Soon!"})} variant="outline" size="lg" className="w-full sm:w-auto" disabled><FileText className="mr-2 h-5 w-5" /> Generate Cover Letter for any JD</Button>
        </CardContent>
      </Card>
      {currentUser && (<><Separator className="my-10" /><Card className="shadow-lg"><CardHeader><CardTitle className="font-headline text-xl flex items-center"><MessageSquare className="mr-2 h-6 w-6 text-primary" /> Site Feedback</CardTitle><CardDescription>Encountered an issue or have a suggestion?</CardDescription></CardHeader><CardContent><FeedbackDialog source="profile-page" triggerButton={<Button variant="outline" size="lg"><MessageSquare className="mr-2 h-5 w-5" /> Share Your Feedback</Button>} /></CardContent></Card></>)}
      <Separator className="my-10" />
      <Card className="shadow-lg border-destructive">
        <CardHeader><CardTitle className="font-headline text-xl flex items-center text-destructive"><AlertTriangle className="mr-2 h-6 w-6" /> Danger Zone</CardTitle><CardDescription>Proceed with caution. These actions are irreversible.</CardDescription></CardHeader>
        <CardContent>
          <AlertDialog><AlertDialogTrigger asChild><Button variant="destructive" className="w-full sm:w-auto"><Trash2 className="mr-2 h-4 w-4" /> Delete Account</Button></AlertDialogTrigger>
            <AlertDialogContent><AlertDialogHeader><AlertDialogTitle className="flex items-center"><AlertTriangle className="mr-2 h-5 w-5 text-destructive" /> Are you absolutely sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete your account and all associated data.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={async () => { if (!backendUserId || !firebaseUser) { toast({ title: "Error", variant: "destructive" }); return; } setIsLoggingOut(true); try { if (currentUser?.resume) { try { await deleteObject(storageRef(storage, currentUser.resume)); } catch (storageError: any) { if (storageError.code !== 'storage/object-not-found') console.warn("Could not delete resume:", storageError); } } await apiClient.delete<UserModifyResponse>(`/users/${backendUserId}`); await deleteFirebaseUser(firebaseUser); toast({ title: "Account Deleted"}); } catch (error) { toast({ title: "Deletion Failed", description: getErrorMessage(error), variant: "destructive" }); setIsLoggingOut(false); } }} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Yes, delete account</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
