
"use client";

import { useEffect, useState, ChangeEvent } from 'react';
import { useForm, type SubmitHandler, Controller, useFieldArray, FieldErrors } from 'react-hook-form';
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
import { User as UserIcon, Edit3, FileText, Wand2, Phone, Briefcase, DollarSign, CloudSun, BookUser, ListChecks, MapPin, Globe, Trash2, AlertTriangle, LogOut as LogOutIcon, MessageSquare, UploadCloud, Paperclip, XCircle, GraduationCap, Award, PlusCircle, Building, School, ScrollText, CalendarIcon, Edit, Check, X, Save } from 'lucide-react';
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

const educationYearSchema = z.preprocess(
  (val) => {
    if (typeof val === 'string' && val.trim() === '') return undefined;
    if (val === null || val === undefined) return undefined;
    const num = Number(val);
    return isNaN(num) ? val : num;
  },
  z.coerce.number({invalid_type_error: "Year must be a number."})
    .int("Year must be a whole number.")
    .min(1900, "Year must be 1900 or later.")
    .max(new Date().getFullYear() + 15, (val) => `Year cannot be significantly far in the future. Max: ${val.max}.`)
    .optional()
    .nullable()
);

const workExperienceSchema = z.object({
  id: z.string().optional(),
  company_name: z.string().min(1, "Company name is required."),
  job_title: z.string().min(1, "Job title is required."),
  start_date: z.string().min(1, "Start date is required.").regex(dateRegex, dateErrorMessage),
  end_date: z.string().regex(dateRegex, dateErrorMessage).optional().nullable(),
  description: z.string().max(1000, "Description max 1000 chars.").optional().nullable().transform(val => (val === "" ? null : val)),
  currently_working: z.boolean().optional(),
});
// .refine(data => { // Temporarily commented out for debugging
//   if (!data.start_date || !data.end_date || data.currently_working) return true;
//   try {
//     const startDate = parseISO(data.start_date);
//     const endDate = parseISO(data.end_date);
//     if (!isValid(startDate) || !isValid(endDate)) return true; 
//     return endDate >= startDate;
//   } catch { return true; } 
// }, {
//   message: "End date cannot be before start date.",
//   path: ["end_date"],
// });


const educationSchema = z.object({
  id: z.string().optional(),
  institution: z.string().min(1, "Institution name is required."),
  degree: z.string().min(1, "Degree is required."),
  start_year: educationYearSchema,
  end_year: educationYearSchema,
  currently_studying: z.boolean().optional(),
});
// .refine(data => { // Temporarily commented out for debugging
//   if (!data.start_year || !data.end_year || data.currently_studying) return true;
//   if (typeof data.start_year !== 'number' || typeof data.end_year !== 'number') return true; 
//   return data.end_year >= data.start_year;
// }, {
//   message: "End year cannot be before start year.",
//   path: ["end_year"],
// });

const certificationSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Certification title is required."),
  issued_by: z.string().optional().nullable().transform(val => (val === "" ? null : val)),
  issue_date: z.string().regex(dateRegex, dateErrorMessage).optional().nullable(),
  credential_url: z.string().url("Must be a valid URL if provided.")
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
type EditableSection = 'personal_contact' | 'professional_background' | 'job_preferences' | 'work_experiences' | 'educations' | 'certifications' | null;

const getErrorMessage = (error: any): string => {
  if (error instanceof AxiosError && error.response) {
    const detail = error.response.data?.detail;
    const messages = error.response.data?.messages;
    if (typeof detail === 'object' && detail !== null) {
      try { return JSON.stringify(detail); } catch { /* ignore */ }
    }
    if (detail) { return typeof detail === 'string' ? detail : String(detail); }
    if (typeof messages === 'object' && messages !== null) {
       try { return JSON.stringify(messages); } catch { /* ignore */ }
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
  const [isSubmittingSection, setIsSubmittingSection] = useState<EditableSection | null>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { /* Defaults set in useEffect */ }
  });
  const { register, handleSubmit, formState: { errors, isSubmitting: isFormSubmitting }, reset, control, setValue, watch, clearErrors, getValues, trigger } = form;

  const { fields: workFields, append: appendWork, remove: removeWork, update: updateWork } = useFieldArray({ control, name: "work_experiences" });
  const { fields: eduFields, append: appendEdu, remove: removeEdu, update: updateEdu } = useFieldArray({ control, name: "educations" });
  const { fields: certFields, append: appendCert, remove: removeCert, update: updateCert } = useFieldArray({ control, name: "certifications" });

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
    } catch (e) { /* ignore */ }
    return dateStr; // Return original string if parsing fails to allow Zod to catch format error
  };
  
  const formatDateForDisplay = (dateInput: string | undefined | null, displayFormat: string = 'MMM yyyy'): string => {
    if (typeof dateInput !== 'string' || !dateInput.trim()) {
      return 'N/A';
    }
    try {
      const dateObj = parseISO(dateInput);
      if (isValid(dateObj)) {
        return format(dateObj, displayFormat);
      }
    } catch (e) { 
      console.warn("Error parsing date for display:", dateInput, e);
      return "Invalid Date";
     }
    return dateInput; // Fallback for unparseable or invalid dates
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
      countries: user?.countries?.join(', ') || '', // Convert array to comma-separated string for form
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

  const handleResumeFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { toast({ title: "File Too Large", description: "Resume file should be less than 5MB.", variant: "destructive" }); event.target.value = ''; return; }
      const allowedTypes = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
      if (!allowedTypes.includes(file.type)) { toast({ title: "Invalid File Type", description: "Please upload a PDF or Word document.", variant: "destructive" }); event.target.value = ''; return; }
      setSelectedResumeFile(file);
    } else { setSelectedResumeFile(null); }
  };

  const handleRemoveResume = async () => {
    if (!currentResumeUrl || !firebaseUser) return;
    setIsUploadingResume(true);
    try {
      const fileRef = storageRef(storage, currentResumeUrl);
      await deleteObject(fileRef);
      if (backendUserId) {
        await apiClient.put(`/users/${backendUserId}`, { resume: null, country: getValues().countries });
        setValue('resume', null, { shouldValidate: true, shouldDirty: true });
        setCurrentResumeUrl(null); setSelectedResumeFile(null);
        await refetchBackendUser(); toast({ title: "Resume Removed" });
      }
    } catch (error) { toast({ title: "Removal Failed", description: getErrorMessage(error), variant: "destructive" });
    } finally { setIsUploadingResume(false); }
  };

  const handleSectionEditToggle = (sectionName: EditableSection) => {
    if (editingSection === sectionName) { 
      setEditingSection(null);
    } else if (editingSection !== null) { 
      toast({ title: "Finish Current Edit", description: `Please click "Save Section" or "Cancel" for the '${editingSection.replace(/_/g,' ')}' section first.`, variant: "destructive" });
    } else { 
      setEditingSection(sectionName);
    }
  };

  const handleCancelSectionEdit = (sectionName: EditableSection) => {
    if (!currentUser && !firebaseUser) return;
    const originalFormValues = mapUserToFormValues(currentUser, firebaseUser);

    switch (sectionName) {
      case 'personal_contact':
        setValue('username', originalFormValues.username);
        setValue('email_id', originalFormValues.email_id);
        setValue('phone_number', originalFormValues.phone_number);
        setValue('preferred_locations', originalFormValues.preferred_locations);
        setValue('countries', originalFormValues.countries);
        break;
      case 'professional_background':
        setValue('professional_summary', originalFormValues.professional_summary);
        setValue('experience', originalFormValues.experience);
        setValue('resume', originalFormValues.resume);
        setCurrentResumeUrl(originalFormValues.resume);
        setSelectedResumeFile(null);
        setValue('skills', originalFormValues.skills);
        break;
      case 'job_preferences':
        setValue('desired_job_role', originalFormValues.desired_job_role);
        setValue('remote_preference', originalFormValues.remote_preference);
        setValue('expected_salary', originalFormValues.expected_salary);
        break;
      case 'work_experiences':
        setValue('work_experiences', originalFormValues.work_experiences);
        break;
      case 'educations':
        setValue('educations', originalFormValues.educations);
        break;
      case 'certifications':
        setValue('certifications', originalFormValues.certifications);
        break;
    }
    setEditingSection(null);
  };

  const handleSaveSection = async (sectionKey: EditableSection, sectionData: Partial<UserUpdateAPI>) => {
    if (!backendUserId) {
      toast({ title: "Error", description: "User session not found. Cannot save.", variant: "destructive" });
      return;
    }
    setIsSubmittingSection(sectionKey);

    // Always include 'country' (from 'countries' form field) in the payload
    const currentCountries = getValues().countries;
    const payload: UserUpdateAPI = {
      ...sectionData,
      country: currentCountries // Already a comma-separated string from the form
    };
    
    try {
      const response = await apiClient.put<UserModifyResponse>(`/users/${backendUserId}`, payload);
      if (response.data.messages?.toLowerCase() === 'success') {
        await refetchBackendUser();
        setEditingSection(null);
        toast({ title: `${sectionKey?.replace(/_/g, ' ')} Updated Successfully` });
      } else {
        throw new Error(response.data.messages || `Backend issue during ${sectionKey} update.`);
      }
    } catch (error) {
      toast({ title: "Update Failed", description: getErrorMessage(error), variant: "destructive" });
    } finally {
      setIsSubmittingSection(null);
    }
  };


  if (isLoggingOut) return <FullPageLoading message="Processing Account Deletion..." />;
  if (isLoadingAuth || !hasPopulatedFromCurrentUser) return <FullPageLoading message="Loading profile..." />;
  if (!currentUser && !isLoadingAuth && !isLoggingOut && !firebaseUser) return <FullPageLoading message="Verifying session..." />;

  const overallSubmitting = isFormSubmitting || isUploadingResume || !!isSubmittingSection;

  const SectionCard: React.FC<{title: string; description: string; sectionKey: EditableSection; children: React.ReactNode; editContent: React.ReactNode; onSave: () => Promise<void>; icon?: React.ElementType }> = 
    ({ title, description, sectionKey, children, editContent, onSave, icon: Icon }) => (
    <Card className="shadow-lg">
      <CardHeader className="flex flex-row justify-between items-start">
        <div>
          <CardTitle className="font-headline text-xl flex items-center">
            {Icon && <Icon className="mr-2 h-5 w-5 text-primary" />}
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        {editingSection !== sectionKey && (
          <Button variant="outline" size="sm" onClick={() => handleSectionEditToggle(sectionKey)} disabled={!!editingSection && editingSection !== sectionKey || overallSubmitting}>
            <Edit className="mr-2 h-4 w-4" /> Edit
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {editingSection === sectionKey ? editContent : children}
        {editingSection === sectionKey && (
          <div className="flex gap-2 mt-6">
            <Button type="button" variant="default" onClick={onSave} disabled={isSubmittingSection === sectionKey || overallSubmitting}>
             {isSubmittingSection === sectionKey ? <LoadingSpinner size={16} className="mr-2" /> : <Save className="mr-2 h-4 w-4" />}
              {isSubmittingSection === sectionKey ? 'Saving...' : 'Save Section'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => handleCancelSectionEdit(sectionKey)} disabled={isSubmittingSection === sectionKey || overallSubmitting}><X className="mr-2 h-4 w-4" /> Cancel</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
  
  const DisplayField: React.FC<{label: string; value?: string | number | null | string[]; icon?: React.ElementType }> = ({ label, value, icon: Icon }) => {
    let displayValue = 'N/A';
    if (Array.isArray(value)) {
      displayValue = value.length > 0 ? value.join(', ') : 'N/A';
    } else if (value !== null && value !== undefined && String(value).trim() !== '') {
      if (label === "Expected Salary" && typeof value === 'number') {
        displayValue = `$${value.toLocaleString()}`;
      } else {
        displayValue = String(value);
      }
    }
    return (
      <div className="mb-3">
        <Label className="text-sm text-muted-foreground flex items-center">
          {Icon && <Icon className="mr-2 h-4 w-4 text-muted-foreground" />}
          {label}
        </Label>
        <p className="text-base text-foreground whitespace-pre-line">{displayValue}</p>
      </div>
    );
  };

  // --- Section Specific Save Handlers ---
  const handleSavePersonalContact = async () => {
    const isValid = await trigger(["username", "email_id", "phone_number", "preferred_locations", "countries"]);
    if (!isValid) {
      toast({ title: "Validation Error", description: "Please check personal contact fields.", variant: "destructive" });
      return;
    }
    const data = getValues();
    const payload: Partial<UserUpdateAPI> = {
      username: data.username,
      // email_id is not updatable
      number: data.phone_number || null,
      preferred_locations: data.preferred_locations || undefined, // Backend expects comma-separated string
      // 'country' (singular) is added to all payloads by handleSaveSection
    };
    await handleSaveSection('personal_contact', payload);
  };

  const handleSaveProfessionalBackground = async () => {
    let newResumeUrlFromUpload: string | undefined = undefined;
    let uploadSucceeded = true;

    if (selectedResumeFile && firebaseUser) {
      setIsUploadingResume(true); setUploadResumeProgress(0);
      const filePath = `users/${firebaseUser.uid}/uploaded_resumes/${Date.now()}_${selectedResumeFile.name}`;
      const fileStorageRef = storageRef(storage, filePath);
      const uploadTask = uploadBytesResumable(fileStorageRef, selectedResumeFile);
      
      try {
        if (currentResumeUrl) { try { await deleteObject(storageRef(storage, currentResumeUrl)); } catch (deleteError: any) { if (deleteError.code !== 'storage/object-not-found') console.warn("Could not delete old resume during update:", deleteError); } }
        await new Promise<void>((resolve, reject) => {
          uploadTask.on('state_changed', 
            (snapshot) => setUploadResumeProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
            (error) => { console.error("Upload task error:", error); reject(error); }, 
            async () => { try { newResumeUrlFromUpload = await getDownloadURL(uploadTask.snapshot.ref); uploadSucceeded = true; resolve(); } catch (getUrlError){ console.error("Get URL error:", getUrlError); reject(getUrlError); } }
          );
        });
      } catch (error) {
        uploadSucceeded = false;
        toast({ title: "Resume Upload Failed", description: `${getErrorMessage(error)} Section not saved.`, variant: "destructive" });
      } finally {
          setIsUploadingResume(false);
          setUploadResumeProgress(null);
      }
      if (!uploadSucceeded) return;
    }
    
    const isValid = await trigger(["professional_summary", "experience", "skills", "resume"]);
    if (!isValid && !uploadSucceeded && selectedResumeFile) { // If upload failed, don't proceed
        toast({title: "Validation Error", description: "Please check professional background fields or resume upload.", variant: "destructive"});
        return;
    }
    if (!isValid && !(selectedResumeFile && !uploadSucceeded)) { // If validation failed for other reasons
        toast({title: "Validation Error", description: "Please check professional background fields.", variant: "destructive"});
        return;
    }

    const data = getValues();
    const finalResumeUrl = newResumeUrlFromUpload !== undefined ? newResumeUrlFromUpload : data.resume;

    const payload: Partial<UserUpdateAPI> = {
      professional_summary: data.professional_summary || null,
      experience: data.experience ?? null,
      skills: data.skills || undefined, // Backend expects comma-separated string
      resume: finalResumeUrl,
    };
    await handleSaveSection('professional_background', payload);
    if (uploadSucceeded && newResumeUrlFromUpload) setSelectedResumeFile(null);
  };

  const handleSaveJobPreferences = async () => {
    const isValid = await trigger(["desired_job_role", "remote_preference", "expected_salary"]);
     if (!isValid) {
      toast({ title: "Validation Error", description: "Please check job preference fields.", variant: "destructive" });
      return;
    }
    const data = getValues();
    const payload: Partial<UserUpdateAPI> = {
      desired_job_role: data.desired_job_role || null,
      remote_preference: data.remote_preference || null,
      expected_salary: data.expected_salary ?? null,
    };
    await handleSaveSection('job_preferences', payload);
  };

  const handleSaveWorkExperiences = async () => {
    const isValid = await trigger("work_experiences");
    if (!isValid) {
      toast({ title: "Validation Error", description: "Please check work experience entries.", variant: "destructive" });
      return;
    }
    const data = getValues();
    const payload: Partial<UserUpdateAPI> = {
      work_experiences: data.work_experiences?.map(({id, currently_working, ...rest}) => ({ ...rest, company_name: rest.company_name || '', job_title: rest.job_title || '', start_date: rest.start_date || '', end_date: currently_working ? null : (rest.end_date || null), description: rest.description || null, })) || [],
    };
    await handleSaveSection('work_experiences', payload);
  };
  
  const handleSaveEducations = async () => {
    const isValid = await trigger("educations");
    if (!isValid) {
      toast({ title: "Validation Error", description: "Please check education entries.", variant: "destructive" });
      return;
    }
    const data = getValues();
    const payload: Partial<UserUpdateAPI> = {
      educations: data.educations?.map(({id, currently_studying, ...rest}) => ({ ...rest, institution: rest.institution || '', degree: rest.degree || '', start_year: rest.start_year ?? null, end_year: currently_studying ? null : (rest.end_year ?? null), })) || [],
    };
    await handleSaveSection('educations', payload);
  };

  const handleSaveCertifications = async () => {
    const isValid = await trigger("certifications");
    if (!isValid) {
      toast({ title: "Validation Error", description: "Please check certification entries.", variant: "destructive" });
      return;
    }
    const data = getValues();
    const payload: Partial<UserUpdateAPI> = {
      certifications: data.certifications?.map(({id, ...rest}) => ({ ...rest, title: rest.title || '', issued_by: rest.issued_by || null, issue_date: rest.issue_date || null, credential_url: rest.credential_url || null, })) || [],
    };
    await handleSaveSection('certifications', payload);
  };

  // --- Render Methods ---
  const renderPersonalContactInfo = () => {
    const currentData = getValues(); // Use getValues to get current form state for display
    const displayContent = (
      <div className="space-y-3">
        <DisplayField label="Full Name" value={currentData.username} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
          <DisplayField label="Email Address" value={currentData.email_id} />
          <DisplayField label="Phone Number" value={currentData.phone_number} icon={Phone} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
          <DisplayField label="Preferred Locations" value={currentData.preferred_locations} icon={MapPin} />
          <DisplayField label="Target Countries" value={currentData.countries} icon={Globe} />
        </div>
      </div>
    );
    const editContent = (
      <div className="space-y-6">
        <div className="space-y-2 md:max-w-md"><Label htmlFor="username">Full Name</Label><Input id="username" {...register('username')} placeholder="Your Full Name" className={`${errors.username ? 'border-destructive' : ''}`} />{errors.username && <p className="text-sm text-destructive">{errors.username.message}</p>}</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2"><Label htmlFor="email_id">Email Address</Label><Input id="email_id" type="email" {...register('email_id')} placeholder="you@example.com" className={errors.email_id ? 'border-destructive' : ''} readOnly />{errors.email_id && <p className="text-sm text-destructive">{errors.email_id.message}</p>}</div>
          <div className="space-y-2"><Label htmlFor="phone_number">Phone Number</Label><div className="relative flex items-center"><Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="phone_number" type="tel" {...register('phone_number')} placeholder="(123) 456-7890" className={`pl-10 ${errors.phone_number ? 'border-destructive' : ''}`} /></div><p className="text-xs text-muted-foreground">Optional.</p>{errors.phone_number && <p className="text-sm text-destructive">{errors.phone_number.message}</p>}</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2"><Label htmlFor="preferred_locations">Preferred Locations (comma-separated)</Label><div className="relative flex items-center"><MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="preferred_locations" {...register('preferred_locations')} placeholder="e.g., New York, Remote, London" className={`pl-10 ${errors.preferred_locations ? 'border-destructive' : ''}`} /></div><p className="text-xs text-muted-foreground">Optional. Enter cities or "Remote".</p>{errors.preferred_locations && <p className="text-sm text-destructive">{errors.preferred_locations.message}</p>}</div>
          <div className="space-y-2"><Label htmlFor="countries">Target Countries (comma-separated) <span className="text-destructive">*</span></Label><div className="relative flex items-center"><Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="countries" {...register('countries')} placeholder="e.g., US, CA, GB, India" className={`pl-10 ${errors.countries ? 'border-destructive' : ''}`} /></div><p className="text-xs text-muted-foreground">Required. Helps in fetching relevant jobs.</p>{errors.countries && <p className="text-sm text-destructive">{errors.countries.message}</p>}</div>
        </div>
      </div>
    );
    return <SectionCard title="Personal &amp; Contact Information" description="Basic information about you." sectionKey="personal_contact" editContent={editContent} onSave={handleSavePersonalContact} icon={UserIcon}>{displayContent}</SectionCard>;
  };

  const renderProfessionalBackground = () => {
    const currentData = getValues();
    const displayContent = (
      <div className="space-y-4">
        <DisplayField label="Professional Summary" value={currentData.professional_summary} icon={BookUser} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
          <DisplayField label="Years of Professional Experience" value={currentData.experience} icon={Briefcase} />
          <div>
            <Label className="text-sm text-muted-foreground flex items-center">
              <Paperclip className="mr-2 h-4 w-4 text-muted-foreground" />
              Your Resume
            </Label>
            {currentResumeUrl ? (
              <div className="mt-1 flex items-center justify-between p-2 border rounded-md bg-muted/30">
                <a href={currentResumeUrl} target="_blank" rel="noopener noreferrer" className="text-base text-primary hover:underline flex items-center truncate">
                  <span className="truncate">{currentResumeUrl.split('/').pop()?.split('?')[0].substring(currentResumeUrl.lastIndexOf('_') + 1) || "View Current Resume"}</span>
                </a>
              </div>
            ) : <p className="text-base text-foreground">N/A</p>}
          </div>
        </div>
        <DisplayField label="Key Skills" value={currentData.skills} icon={ListChecks}/>
      </div>
    );
    const editContent = (
      <div className="space-y-6">
        <div className="space-y-2"><Label htmlFor="professional_summary" className="text-base flex items-center"><BookUser className="mr-2 h-5 w-5 text-primary/80"/>Professional Summary</Label><Textarea id="professional_summary" {...register('professional_summary')} placeholder="A detailed summary..." rows={8} className={errors.professional_summary ? 'border-destructive' : ''} /><p className="text-xs text-muted-foreground">Optional. Min 50 chars if provided.</p>{errors.professional_summary && <p className="text-sm text-destructive">{errors.professional_summary.message}</p>}</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2"><Label htmlFor="experience">Years of Professional Experience</Label><div className="relative flex items-center"><Briefcase className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="experience" type="number" {...register('experience')} placeholder="e.g., 5" className={`pl-10 hide-number-spinners ${errors.experience ? 'border-destructive' : ''}`} /></div><p className="text-xs text-muted-foreground">Optional.</p>{errors.experience && <p className="text-sm text-destructive">{errors.experience.message}</p>}</div>
            <div className="space-y-2"><Label htmlFor="resume-upload">Your Resume</Label><Input id="resume-upload" type="file" onChange={handleResumeFileChange} accept=".pdf,.doc,.docx" className="mb-1 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20" disabled={isUploadingResume || overallSubmitting}/><p className="text-xs text-muted-foreground mt-1">Optional. PDF or Word, max 5MB.</p>{selectedResumeFile && !isUploadingResume && (<p className="text-xs text-muted-foreground mt-1">Selected: {selectedResumeFile.name}</p>)}{currentResumeUrl && !selectedResumeFile && !isUploadingResume && (<div className="mt-2 mb-2 flex items-center justify-between p-2 border rounded-md bg-muted/50"><a href={currentResumeUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center truncate"><Paperclip className="w-4 h-4 mr-2 shrink-0" /><span className="truncate">{currentResumeUrl.split('/').pop()?.split('?')[0].substring(currentResumeUrl.lastIndexOf('_') + 1) || "View Current"}</span></a><Button type="button" variant="ghost" size="icon" onClick={handleRemoveResume} className="h-7 w-7 text-destructive hover:bg-destructive/10" disabled={overallSubmitting || isUploadingResume}><XCircle className="w-4 h-4" /></Button></div>)}{isUploadingResume && uploadResumeProgress !== null && (<div className="mt-2"><Progress value={uploadResumeProgress} className="w-full h-2" /><p className="text-xs text-muted-foreground text-center mt-1">Uploading: {Math.round(uploadResumeProgress)}%</p></div>)}{errors.resume && <p className="text-sm text-destructive">{errors.resume.message}</p>}<input type="hidden" {...register('resume')} /></div>
        </div>
        <div className="space-y-2"><Label htmlFor="skills" className="text-base flex items-center"><ListChecks className="mr-2 h-5 w-5 text-primary/80"/>Key Skills (comma-separated)</Label><Textarea id="skills" {...register('skills')} placeholder="e.g., React, Node.js, Python" rows={3} className={errors.skills ? 'border-destructive' : ''} /><p className="text-xs text-muted-foreground">Optional. Helps AI find relevant jobs.</p>{errors.skills && <p className="text-sm text-destructive">{errors.skills.message}</p>}</div>
      </div>
    );
    return <SectionCard title="Professional Background" description="Experience, skills, and resume summary." sectionKey="professional_background" editContent={editContent} onSave={handleSaveProfessionalBackground} icon={Briefcase}>{displayContent}</SectionCard>;
  };

  const renderJobPreferences = () => {
    const currentData = getValues();
    const displayContent = (
      <div className="space-y-3">
        <DisplayField label="Ideal Job Role" value={currentData.desired_job_role}/>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
          <DisplayField label="Remote Work Preference" value={currentData.remote_preference} icon={CloudSun}/>
          <DisplayField label="Expected Salary" value={currentData.expected_salary} icon={DollarSign}/>
        </div>
      </div>
    );
    const editContent = (
      <div className="space-y-6">
        <div className="space-y-2"><Label htmlFor="desired_job_role" className="text-base">Ideal Job Role</Label><Textarea id="desired_job_role" {...register('desired_job_role')} placeholder="e.g., Senior Frontend Developer..." rows={5} className={errors.desired_job_role ? 'border-destructive' : ''} /><p className="text-xs text-muted-foreground">Optional. Min 10 chars if provided.</p>{errors.desired_job_role && <p className="text-sm text-destructive">{errors.desired_job_role.message}</p>}</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2"><Label htmlFor="remote_preference">Remote Work Preference</Label><Controller name="remote_preference" control={control} render={({ field }) => (<Select onValueChange={field.onChange} value={field.value ?? undefined} disabled={overallSubmitting}><SelectTrigger className={`relative w-full justify-start pl-10 pr-3 ${errors.remote_preference ? 'border-destructive' : ''}`}><CloudSun className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><SelectValue placeholder="Select preference" /></SelectTrigger><SelectContent>{remotePreferenceOptions.map(option => (<SelectItem key={option} value={option}>{option}</SelectItem>))}</SelectContent></Select>)}/><p className="text-xs text-muted-foreground">Optional.</p>{errors.remote_preference && <p className="text-sm text-destructive">{errors.remote_preference.message}</p>}</div>
            <div className="space-y-2"><Label htmlFor="expected_salary">Expected Salary (Numeric)</Label><div className="relative flex items-center"><DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="expected_salary" type="number" {...register('expected_salary')} placeholder="e.g., 120000" className={`pl-10 hide-number-spinners ${errors.expected_salary ? 'border-destructive' : ''}`} disabled={overallSubmitting}/></div><p className="text-xs text-muted-foreground">Optional. Enter as a number.</p>{errors.expected_salary && <p className="text-sm text-destructive">{errors.expected_salary.message}</p>}</div>
        </div>
      </div>
    );
    return <SectionCard title="Job Preferences" description="Tailor job suggestions to your ideal role." sectionKey="job_preferences" editContent={editContent} onSave={handleSaveJobPreferences} icon={Wand2}>{displayContent}</SectionCard>;
  };

  const renderWorkExperiences = () => {
    const experiencesToDisplay = getValues().work_experiences || currentUser?.work_experiences || [];
    const displayContent = (
      <div className="space-y-3">
        {experiencesToDisplay.length > 0 ? (
          experiencesToDisplay.map(exp => (
            <div key={exp.id || exp.company_name + exp.job_title} className="p-3 border rounded-md bg-muted/20">
              <h4 className="font-semibold">{exp.job_title || 'N/A'} at {exp.company_name || 'N/A'}</h4>
              <p className="text-sm text-muted-foreground">
                {formatDateForDisplay(exp.start_date, 'MMM yyyy')} - {exp.currently_working ? 'Present' : formatDateForDisplay(exp.end_date, 'MMM yyyy')}
              </p>
              {exp.description && <p className="text-sm mt-1 whitespace-pre-line">{exp.description}</p>}
            </div>
          ))
        ) : <p className="text-sm text-muted-foreground">No work experience added yet.</p>}
      </div>
    );
    const editContent = (
      <>
        {workFields.map((item, index) => {
          const currentlyWorking = watch(`work_experiences.${index}.currently_working`);
          const fieldStartDate = watch(`work_experiences.${index}.start_date`);
          const fieldEndDate = watch(`work_experiences.${index}.end_date`);

          return (
            <Card key={item.id} className="p-4 bg-muted/30 border-dashed mb-4">
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><Label htmlFor={`work_experiences.${index}.company_name`}>Company Name <span className="text-destructive">*</span></Label><Input {...register(`work_experiences.${index}.company_name`)} placeholder="e.g., Acme Corp" className={errors.work_experiences?.[index]?.company_name ? 'border-destructive' : ''}/>{errors.work_experiences?.[index]?.company_name && <p className="text-sm text-destructive">{errors.work_experiences[index]?.company_name?.message}</p>}</div>
                  <div><Label htmlFor={`work_experiences.${index}.job_title`}>Job Title <span className="text-destructive">*</span></Label><Input {...register(`work_experiences.${index}.job_title`)} placeholder="e.g., Software Engineer" className={errors.work_experiences?.[index]?.job_title ? 'border-destructive' : ''}/>{errors.work_experiences?.[index]?.job_title && <p className="text-sm text-destructive">{errors.work_experiences[index]?.job_title?.message}</p>}</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                  <div><Label htmlFor={`work_experiences.${index}.start_date`}>Start Date <span className="text-destructive">*</span></Label>
                    <Controller control={control} name={`work_experiences.${index}.start_date`} render={({ field }) => (
                      <Popover><PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground", errors.work_experiences?.[index]?.start_date && "border-destructive")}><CalendarIcon className="mr-2 h-4 w-4" />{field.value && isValid(parseISO(field.value)) ? format(parseISO(field.value), "PPP") : <span>Pick a date</span>}</Button></PopoverTrigger>
                        <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value && isValid(parseISO(field.value)) ? parseISO(field.value) : undefined} onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")} captionLayout="dropdown-buttons" fromYear={calendarFromYear} toYear={calendarToYear} initialFocus /></PopoverContent></Popover>)}/>
                    {errors.work_experiences?.[index]?.start_date && <p className="text-sm text-destructive">{errors.work_experiences[index]?.start_date?.message}</p>}</div>
                  <div><Label htmlFor={`work_experiences.${index}.end_date`}>End Date {currentlyWorking ? "" : <span className="text-destructive">*</span>}</Label>
                    <Controller control={control} name={`work_experiences.${index}.end_date`} render={({ field }) => (
                      <Popover><PopoverTrigger asChild><Button variant={"outline"} disabled={currentlyWorking} className={cn("w-full justify-start text-left font-normal", !field.value && !currentlyWorking && "text-muted-foreground", errors.work_experiences?.[index]?.end_date && !currentlyWorking && "border-destructive")}><CalendarIcon className="mr-2 h-4 w-4" />{field.value && !currentlyWorking && isValid(parseISO(field.value)) ? format(parseISO(field.value), "PPP") : <span>Pick a date</span>}</Button></PopoverTrigger>
                        <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value && isValid(parseISO(field.value)) ? parseISO(field.value) : undefined} onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : null)} captionLayout="dropdown-buttons" fromYear={calendarFromYear} toYear={calendarToYear} /></PopoverContent></Popover>)}/>
                    {errors.work_experiences?.[index]?.end_date && !currentlyWorking && <p className="text-sm text-destructive">{errors.work_experiences[index]?.end_date?.message}</p>}</div>
                </div>
                <div className="flex items-center space-x-2">
                  <Controller name={`work_experiences.${index}.currently_working`} control={control} render={({ field }) => (<Checkbox id={`work_exp_current_${index}`} checked={!!field.value} onCheckedChange={(checked) => { field.onChange(checked); if (checked) { setValue(`work_experiences.${index}.end_date`, null); clearErrors(`work_experiences.${index}.end_date`); } }}/>)}/>
                  <Label htmlFor={`work_exp_current_${index}`} className="text-sm font-normal">I currently work here</Label></div>
                <div><Label htmlFor={`work_experiences.${index}.description`}>Description</Label><Textarea {...register(`work_experiences.${index}.description`)} placeholder="Key responsibilities..." rows={3} className={errors.work_experiences?.[index]?.description ? 'border-destructive' : ''}/>{errors.work_experiences?.[index]?.description && <p className="text-sm text-destructive">{errors.work_experiences[index]?.description?.message}</p>}</div>
                <Button type="button" variant="outline" size="sm" onClick={() => removeWork(index)} className="text-destructive hover:bg-destructive/10"><Trash2 className="mr-2 h-3.5 w-3.5" /> Remove</Button>
              </div>
            </Card>
          );
        })}
        <Button type="button" variant="outline" onClick={() => appendWork({ id: crypto.randomUUID(), company_name: '', job_title: '', start_date: '', end_date: null, description: '', currently_working: false })}><PlusCircle className="mr-2 h-4 w-4" /> Add Work Experience</Button>
      </>
    );
    return <SectionCard title="Work Experience" description="Detail your professional roles." sectionKey="work_experiences" editContent={editContent} onSave={handleSaveWorkExperiences} icon={Building}>{displayContent}</SectionCard>;
  };

  const renderEducations = () => {
    const educationsToDisplay = getValues().educations || currentUser?.educations || [];
    const displayContent = (
      <div className="space-y-3">
        {educationsToDisplay.length > 0 ? (
          educationsToDisplay.map(edu => (
            <div key={edu.id || edu.institution + edu.degree} className="p-3 border rounded-md bg-muted/20">
              <h4 className="font-semibold">{edu.degree || 'N/A'} from {edu.institution || 'N/A'}</h4>
              <p className="text-sm text-muted-foreground">
                {edu.start_year || 'N/A'} - {edu.currently_studying ? 'Present' : (edu.end_year || 'N/A')}
              </p>
            </div>
          ))
        ) : <p className="text-sm text-muted-foreground">No education added yet.</p>}
      </div>
    );
    const editContent = (
      <>
        {eduFields.map((item, index) => {
          const currentlyStudying = watch(`educations.${index}.currently_studying`);
          return (
            <Card key={item.id} className="p-4 bg-muted/30 border-dashed mb-4">
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><Label htmlFor={`educations.${index}.institution`}>Institution <span className="text-destructive">*</span></Label><Input {...register(`educations.${index}.institution`)} placeholder="e.g., University of Example" className={errors.educations?.[index]?.institution ? 'border-destructive' : ''}/>{errors.educations?.[index]?.institution && <p className="text-sm text-destructive">{errors.educations[index]?.institution?.message}</p>}</div>
                  <div><Label htmlFor={`educations.${index}.degree`}>Degree <span className="text-destructive">*</span></Label><Input {...register(`educations.${index}.degree`)} placeholder="e.g., B.S. in Computer Science" className={errors.educations?.[index]?.degree ? 'border-destructive' : ''}/>{errors.educations?.[index]?.degree && <p className="text-sm text-destructive">{errors.educations[index]?.degree?.message}</p>}</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                  <div><Label htmlFor={`educations.${index}.start_year`}>Start Year</Label><Input type="number" {...register(`educations.${index}.start_year`)} placeholder="YYYY" className={`hide-number-spinners ${errors.educations?.[index]?.start_year ? 'border-destructive' : ''}`}/>{errors.educations?.[index]?.start_year && <p className="text-sm text-destructive">{errors.educations[index]?.start_year?.message}</p>}</div>
                  <div><Label htmlFor={`educations.${index}.end_year`}>End Year</Label><Input type="number" {...register(`educations.${index}.end_year`)} placeholder="YYYY" disabled={currentlyStudying} className={`hide-number-spinners ${errors.educations?.[index]?.end_year && !currentlyStudying ? 'border-destructive' : ''}`}/>{errors.educations?.[index]?.end_year && !currentlyStudying && <p className="text-sm text-destructive">{errors.educations[index]?.end_year?.message}</p>}</div>
                </div>
                <div className="flex items-center space-x-2">
                  <Controller name={`educations.${index}.currently_studying`} control={control} render={({ field }) => (<Checkbox id={`edu_current_${index}`} checked={!!field.value} onCheckedChange={(checked) => { field.onChange(checked); if (checked) { setValue(`educations.${index}.end_year`, null); clearErrors(`educations.${index}.end_year`); } }}/>)}/>
                  <Label htmlFor={`edu_current_${index}`} className="text-sm font-normal">I am currently studying here</Label></div>
                <Button type="button" variant="outline" size="sm" onClick={() => removeEdu(index)} className="text-destructive hover:bg-destructive/10"><Trash2 className="mr-2 h-3.5 w-3.5" /> Remove</Button>
              </div>
            </Card>
          );
        })}
        <Button type="button" variant="outline" onClick={() => appendEdu({ id: crypto.randomUUID(), institution: '', degree: '', start_year: null, end_year: null, currently_studying: false })}><PlusCircle className="mr-2 h-4 w-4" /> Add Education</Button>
      </>
    );
    return <SectionCard title="Education" description="List your academic qualifications." sectionKey="educations" editContent={editContent} onSave={handleSaveEducations} icon={School}>{displayContent}</SectionCard>;
  };

  const renderCertifications = () => {
    const certificationsToDisplay = getValues().certifications || currentUser?.certifications || [];
    const displayContent = (
      <div className="space-y-3">
        {certificationsToDisplay.length > 0 ? (
          certificationsToDisplay.map(cert => (
            <div key={cert.id || cert.title} className="p-3 border rounded-md bg-muted/20">
              <h4 className="font-semibold">{cert.title || 'N/A'}</h4>
              {cert.issued_by && <p className="text-sm text-muted-foreground">Issued by: {cert.issued_by}</p>}
              {cert.issue_date && <p className="text-sm text-muted-foreground">Issued: {formatDateForDisplay(cert.issue_date)}</p>}
              {cert.credential_url && <a href={cert.credential_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">View Credential</a>}
            </div>
          ))
        ) : <p className="text-sm text-muted-foreground">No certifications added yet.</p>}
      </div>
    );
    const editContent = (
      <>
        {certFields.map((item, index) => {
          const fieldIssueDate = watch(`certifications.${index}.issue_date`);
          return (
            <Card key={item.id} className="p-4 bg-muted/30 border-dashed mb-4">
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label htmlFor={`certifications.${index}.title`}>Title <span className="text-destructive">*</span></Label><Input {...register(`certifications.${index}.title`)} placeholder="e.g., AWS Certified" className={errors.certifications?.[index]?.title ? 'border-destructive' : ''}/>{errors.certifications?.[index]?.title && <p className="text-sm text-destructive">{errors.certifications[index]?.title?.message}</p>}</div>
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
        );
        })}
        <Button type="button" variant="outline" onClick={() => appendCert({id: crypto.randomUUID(), title: '', issued_by: '', issue_date: null, credential_url: '' })}><PlusCircle className="mr-2 h-4 w-4" /> Add Certification</Button>
      </>
    );
    return <SectionCard title="Certifications &amp; Licenses" description="Include professional certifications." sectionKey="certifications" editContent={editContent} onSave={handleSaveCertifications} icon={Award}>{displayContent}</SectionCard>;
  };

  return (
    <div className="space-y-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold font-headline flex items-center"><UserIcon className="mr-3 h-8 w-8 text-primary" />My Profile</h1>
        <p className="text-muted-foreground">Keep your profile and job preferences up-to-date for the best job matches.</p>
      </header>

      {/* No global form tag needed as saves are per section */}
      {renderPersonalContactInfo()}
      <Separator className="my-6" />
      {renderProfessionalBackground()}
      <Separator className="my-6" />
      {renderJobPreferences()}
      <Separator className="my-6" />
      {renderWorkExperiences()}
      <Separator className="my-6" />
      {renderEducations()}
      <Separator className="my-6" />
      {renderCertifications()}

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
            <AlertDialogContent><AlertDialogHeader><AlertDialogTitle className="flex items-center"><AlertTriangle className="mr-2 h-5 w-5 text-destructive" /> Are you absolutely sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete your account and all associated data.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={async () => { if (!backendUserId || !firebaseUser) { toast({ title: "Error", variant: "destructive" }); return; } setIsLoggingOut(true); try { if (currentUser?.resume) { try { await deleteObject(storageRef(storage, currentUser.resume)); } catch (storageError: any) { if (storageError.code !== 'storage/object-not-found') console.warn("Could not delete resume:", storageError); } } await apiClient.delete<UserModifyResponse>(`/users/${backendUserId}`); await deleteFirebaseUser(firebaseUser); toast({ title: "Account Deleted"}); router.push('/auth'); } catch (error) { toast({ title: "Deletion Failed", description: getErrorMessage(error), variant: "destructive" }); setIsLoggingOut(false); } }} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Yes, delete account</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
    
