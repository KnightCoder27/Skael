
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { LogIn, UserPlus, Eye, EyeOff, Compass, Phone } from 'lucide-react';
import type { UserIn, UserLogin as UserLoginType, UserLoginResponse, UserRegistrationResponse } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '@/lib/apiClient';
import { auth as firebaseAuth } from '@/lib/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile }from 'firebase/auth';
import { AxiosError } from 'axios';
import { LoadingSpinner } from '@/components/app/loading-spinner';

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});
type LoginFormValues = z.infer<typeof loginSchema>;

const registerSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }).max(50, {message: "Name cannot exceed 50 characters."}),
  email: z.string().email({ message: "Invalid email address." }),
  phoneNumber: z.string().max(20, { message: "Phone number cannot exceed 20 characters." }).optional().or(z.literal("")),
  password: z.string().min(8, { message: "Password must be at least 8 characters." })
    .regex(/[a-z]/, { message: "Password must contain at least one lowercase letter." })
    .regex(/[A-Z]/, { message: "Password must contain at least one uppercase letter." })
    .regex(/[0-9]/, { message: "Password must contain at least one number." })
    .regex(/[^a-zA-Z0-9]/, { message: "Password must contain at least one special character." }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});
type RegisterFormValues = z.infer<typeof registerSchema>;


export default function AuthPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { currentUser, isLoadingAuth, setInternalPendingBackendId } = useAuth();

  useEffect(() => {
    console.log("AuthPage Effect for redirect: isLoadingAuth=", isLoadingAuth, "currentUser present=", !!currentUser);
    if (!isLoadingAuth && currentUser) {
      console.log("AuthPage Effect: Conditions met. Redirecting to /jobs.");
      router.push('/jobs');
      toast({ title: "Login Successful", description: "Redirecting to your dashboard..." });
    }
  }, [currentUser, isLoadingAuth, router, toast]);


  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterConfirmPassword, setShowRegisterConfirmPassword] = useState(false);

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", phoneNumber: "", password: "", confirmPassword: "" },
  });

  const onLoginSubmit: SubmitHandler<LoginFormValues> = async (data) => {
    loginForm.clearErrors();
    let backendUserId: number | null = null;
    toast({ title: "Processing Login...", description: "Verifying credentials..." });
    try {
      const backendLoginPayload: UserLoginType = { email: data.email, password: data.password };
      const backendResponse = await apiClient.post<UserLoginResponse>('/users/login', backendLoginPayload);
      backendUserId = backendResponse.data.user_id;

      if (!backendUserId && backendUserId !== 0) {
        throw new Error("Backend login did not return a valid user ID.");
      }
      
      setInternalPendingBackendId(backendUserId);
      await signInWithEmailAndPassword(firebaseAuth, data.email, data.password);
      // Success toast and redirect will be handled by useEffect watching currentUser

    } catch (error) {
      console.error("AuthPage: Error during login:", error);
      setInternalPendingBackendId(null);

      let errorMessage = "An unexpected error occurred during login.";
      if (error instanceof AxiosError && error.response) {
        errorMessage = error.response.data?.detail || error.response.data?.msg || "Login failed with backend. Please check your credentials.";
         if (error.response.status === 401) {
          loginForm.setError("password", { type: "manual", message: "Invalid email or password (backend)." });
        }
      } else if (error instanceof Error && (error as any).code?.startsWith('auth/')) {
        const firebaseError = error as any;
        const firebaseErrorCode = firebaseError.code;
        if (firebaseErrorCode === 'auth/invalid-credential' || firebaseErrorCode === 'auth/user-not-found' || firebaseErrorCode === 'auth/wrong-password') {
          errorMessage = "Firebase: Invalid credentials. Please check your email and password.";
          loginForm.setError("password", { type: "manual", message: errorMessage });
        } else if (firebaseErrorCode === 'auth/network-request-failed') {
          errorMessage = "Network error connecting to Firebase. Please check your connection or if the domain is authorized in your Firebase project.";
        } else if (firebaseErrorCode === 'auth/operation-not-allowed') {
          errorMessage = "Firebase operation not allowed. This often means the current domain is not authorized in your Firebase project settings (Authentication -> Settings -> Authorized domains).";
        }  else if (firebaseErrorCode === 'auth/invalid-api-key') {
          errorMessage = "Invalid Firebase API Key. Please check your Firebase project configuration.";
        } else {
          errorMessage = `Firebase authentication failed: ${firebaseError.message} (Code: ${firebaseError.code})`;
        }
      }

      if (!loginForm.formState.errors.password && !loginForm.formState.errors.email) {
        toast({
            title: "Login Failed",
            description: errorMessage,
            variant: "destructive"
        });
      }
    }
  };

  const onRegisterSubmit: SubmitHandler<RegisterFormValues> = async (data) => {
    registerForm.clearErrors();
    let newBackendUserId: number | null = null;
    toast({ title: "Processing Registration...", description: "Creating account..." });
    try {
      const backendRegisterPayload: UserIn = {
        username: data.name,
        email: data.email,
        number: data.phoneNumber && data.phoneNumber.trim() !== "" ? data.phoneNumber : null,
        password: data.password,
      };
      
      const backendRegisterResponse = await apiClient.post<UserRegistrationResponse>('/users/', backendRegisterPayload);
      newBackendUserId = backendRegisterResponse.data.id;

      if (!newBackendUserId && newBackendUserId !== 0) {
          throw new Error("Backend registration did not return a valid user ID.");
      }

      setInternalPendingBackendId(newBackendUserId);
      const firebaseUserCredential = await createUserWithEmailAndPassword(firebaseAuth, data.email, data.password);
      await updateProfile(firebaseUserCredential.user, { displayName: data.name });
      // Success toast and redirect will be handled by useEffect watching currentUser

    } catch (error) {
      console.error("AuthPage: Error during registration:", error);
      setInternalPendingBackendId(null);

      let errorMessage = "An unexpected error occurred during registration.";
       if (error instanceof AxiosError && error.response) {
        errorMessage = error.response.data?.detail || error.response.data?.msg ||  "Registration failed with backend. This email might already be in use.";
         if (error.response.status === 400 && (error.response.data?.detail?.toLowerCase().includes("email already registered") || error.response.data?.msg?.toLowerCase().includes("email already registered"))) {
            registerForm.setError("email", { type: "manual", message: "This email is already registered with our system." });
        } else if (error.response.status === 405) {
            errorMessage = "Registration endpoint not found or method not allowed by backend. Please contact support.";
        } else if (error.response.status === 422) { 
            errorMessage = "Registration failed due to invalid data. Please check your inputs.";
            if (error.response.data && Array.isArray(error.response.data.detail)) {
              error.response.data.detail.forEach((err: any) => {
                if (err.loc && err.loc.includes("number") && err.type === "string_type") {
                  registerForm.setError("phoneNumber", { type: "manual", message: "Phone number format is invalid." });
                }
              });
            }
        }
      } else if (error instanceof Error && (error as any).code?.startsWith('auth/')) {
        const firebaseError = error as any;
        const firebaseErrorCode = firebaseError.code;
        if (firebaseErrorCode === 'auth/email-already-in-use') {
            errorMessage = "This email is already in use with Firebase Authentication.";
            registerForm.setError("email", { type: "manual", message: errorMessage });
        } else if (firebaseErrorCode === 'auth/weak-password') {
            errorMessage = "Firebase: Password is too weak (must be at least 6 characters by default).";
            registerForm.setError("password", { type: "manual", message: errorMessage });
        } else if (firebaseErrorCode === 'auth/network-request-failed') {
            errorMessage = "Network error connecting to Firebase. Please check your connection or if the domain is authorized in your Firebase project.";
        } else if (firebaseErrorCode === 'auth/operation-not-allowed') {
            errorMessage = "Firebase operation not allowed. This often means the current domain is not authorized in your Firebase project settings (Authentication -> Settings -> Authorized domains).";
        } else if (firebaseErrorCode === 'auth/invalid-api-key') {
            errorMessage = "Invalid Firebase API Key. Please check your Firebase project configuration.";
        } else {
            errorMessage = `Firebase registration failed: ${firebaseError.message} (Code: ${firebaseError.code})`;
        }
      }

      if (!registerForm.formState.errors.email && !registerForm.formState.errors.password) {
        toast({
            title: "Registration Failed",
            description: errorMessage,
            variant: "destructive"
        });
      }
    }
  };

  if (isLoadingAuth) {
    return (
      <div className="flex min-h-[calc(100vh-12rem)] flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl bg-card text-center p-8">
          <LoadingSpinner size={40} />
          <p className="mt-4 text-muted-foreground">Loading authentication...</p>
        </Card>
      </div>
    );
  }

  const toggleShowLoginPassword = () => setShowLoginPassword(!showLoginPassword);
  const toggleShowRegisterPassword = () => setShowRegisterPassword(!showRegisterPassword);
  const toggleShowRegisterConfirmPassword = () => setShowRegisterConfirmPassword(!showRegisterConfirmPassword);

  return (
    <div className="flex min-h-[calc(100vh-12rem)] flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl bg-card">
        <Tabs defaultValue="login" className="w-full" onValueChange={(value) => setActiveTab(value as 'login' | 'register')}>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
                <Compass className="w-12 h-12 text-primary" />
            </div>
            <CardTitle className="text-2xl font-headline">
                {activeTab === 'login' ? 'Welcome Back!' : 'Create an Account'}
            </CardTitle>
            <CardDescription>
                {activeTab === 'login' ? 'Sign in to access your career dashboard.' : 'Join Career Compass AI to find your path.'}
            </CardDescription>
            <TabsList className="grid w-full grid-cols-2 mt-6 bg-muted">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
          </CardHeader>

          <TabsContent value="login">
            <form onSubmit={loginForm.handleSubmit(onLoginSubmit)}>
              <CardContent className="space-y-4 pt-4">
                <div className="space-y-1">
                  <Label htmlFor="login-email">Email Address</Label>
                  <Input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    {...loginForm.register('email')}
                    className={loginForm.formState.errors.email ? 'border-destructive focus-visible:ring-destructive' : ''}
                  />
                  {loginForm.formState.errors.email && (
                    <p className="text-sm text-destructive">{loginForm.formState.errors.email.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="login-password">Password</Label>
                  <div className="relative flex items-center">
                    <Input
                      id="login-password"
                      type={showLoginPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      {...loginForm.register('password')}
                      className={`pr-10 ${loginForm.formState.errors.password ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                    />
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 h-7 w-7 text-muted-foreground hover:bg-transparent focus-visible:ring-0"
                        onClick={toggleShowLoginPassword}
                        tabIndex={-1}
                        aria-label={showLoginPassword ? "Hide password" : "Show password"}
                    >
                        {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {loginForm.formState.errors.password && (
                    <p className="text-sm text-destructive">{loginForm.formState.errors.password.message}</p>
                  )}
                </div>
                <div className="flex items-center justify-end">
                  <Link href="#" className="text-sm text-primary hover:underline" tabIndex={-1} onClick={(e) => { e.preventDefault(); toast({title: "Feature Coming Soon", description: "Password recovery will be available in a future update."}) }}>
                    Forgot password?
                  </Link>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-4 pt-2">
                <Button type="submit" className="w-full" disabled={loginForm.formState.isSubmitting}>
                  {loginForm.formState.isSubmitting ? <LoadingSpinner size={16} className="mr-2" /> : null}
                  {loginForm.formState.isSubmitting ? 'Logging in...' : 'Login'}
                  {!loginForm.formState.isSubmitting && <LogIn className="ml-2 h-4 w-4" />}
                </Button>
                 <p className="text-center text-sm text-muted-foreground">
                    Don't have an account?{" "}
                    <Button variant="link" className="p-0 h-auto text-primary" onClick={() => {
                        const trigger = document.querySelector('button[role="tab"][data-value="register"]') as HTMLButtonElement | null;
                        trigger?.click();
                        setActiveTab('register');
                        loginForm.reset();
                        registerForm.reset();
                      }}
                    >
                        Register here
                    </Button>
                </p>
              </CardFooter>
            </form>
          </TabsContent>

          <TabsContent value="register">
            <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)}>
              <CardContent className="space-y-3 pt-4">
                <div className="space-y-1">
                  <Label htmlFor="register-name">Full Name</Label>
                  <Input
                    id="register-name"
                    autoComplete="name"
                    placeholder="Your Name"
                    {...registerForm.register('name')}
                     className={registerForm.formState.errors.name ? 'border-destructive focus-visible:ring-destructive' : ''}
                  />
                  {registerForm.formState.errors.name && (
                    <p className="text-sm text-destructive">{registerForm.formState.errors.name.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="register-email">Email Address</Label>
                  <Input
                    id="register-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    {...registerForm.register('email')}
                    className={registerForm.formState.errors.email ? 'border-destructive focus-visible:ring-destructive' : ''}
                  />
                  {registerForm.formState.errors.email && (
                    <p className="text-sm text-destructive">{registerForm.formState.errors.email.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="register-phone">Phone Number (Optional)</Label>
                  <div className="relative flex items-center">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        id="register-phone"
                        type="tel"
                        autoComplete="tel"
                        placeholder="(123) 456-7890"
                        {...registerForm.register('phoneNumber')}
                        className={`pl-10 ${registerForm.formState.errors.phoneNumber ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                    />
                  </div>
                  {registerForm.formState.errors.phoneNumber && (
                    <p className="text-sm text-destructive">{registerForm.formState.errors.phoneNumber.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="register-password">Password</Label>
                   <div className="relative flex items-center">
                    <Input
                      id="register-password"
                      type={showRegisterPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="••••••••"
                      {...registerForm.register('password')}
                      className={`pr-10 ${registerForm.formState.errors.password ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                    />
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 h-7 w-7 text-muted-foreground hover:bg-transparent focus-visible:ring-0"
                        onClick={toggleShowRegisterPassword}
                        tabIndex={-1}
                        aria-label={showRegisterPassword ? "Hide password" : "Show password"}
                    >
                        {showRegisterPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {registerForm.formState.errors.password && (
                    <p className="text-sm text-destructive">{registerForm.formState.errors.password.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="register-confirm-password">Confirm Password</Label>
                  <div className="relative flex items-center">
                    <Input
                      id="register-confirm-password"
                      type={showRegisterConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="••••••••"
                      {...registerForm.register('confirmPassword')}
                      className={`pr-10 ${registerForm.formState.errors.confirmPassword ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                    />
                     <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 h-7 w-7 text-muted-foreground hover:bg-transparent focus-visible:ring-0"
                        onClick={toggleShowRegisterConfirmPassword}
                        tabIndex={-1}
                        aria-label={showRegisterConfirmPassword ? "Hide password" : "Show password"}
                    >
                        {showRegisterConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {registerForm.formState.errors.confirmPassword && (
                    <p className="text-sm text-destructive">{registerForm.formState.errors.confirmPassword.message}</p>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-4 pt-2">
                <Button type="submit" className="w-full" disabled={registerForm.formState.isSubmitting}>
                  {registerForm.formState.isSubmitting ? <LoadingSpinner size={16} className="mr-2" /> : null}
                  {registerForm.formState.isSubmitting ? 'Creating Account...' : 'Create Account'}
                  {!registerForm.formState.isSubmitting && <UserPlus className="ml-2 h-4 w-4" />}
                </Button>
                <p className="px-6 text-center text-xs text-muted-foreground">
                    By clicking Create Account, you agree to our{" "}
                    <Link href="#" className="underline underline-offset-4 hover:text-primary" tabIndex={-1} onClick={(e) => {e.preventDefault(); toast({title: "Placeholder", description: "Terms of Service link."})}}>
                        Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link href="#" className="underline underline-offset-4 hover:text-primary" tabIndex={-1} onClick={(e) => {e.preventDefault(); toast({title: "Placeholder", description: "Privacy Policy link."})}}>
                        Privacy Policy
                    </Link>
                    .
                </p>
                 <p className="text-center text-sm text-muted-foreground">
                    Already have an account?{" "}
                     <Button variant="link" className="p-0 h-auto text-primary" onClick={() => {
                        const trigger = document.querySelector('button[role="tab"][data-value="login"]') as HTMLButtonElement | null;
                        trigger?.click();
                        setActiveTab('login');
                        registerForm.reset();
                        loginForm.reset();
                     }}>
                        Login here
                    </Button>
                </p>
              </CardFooter>
            </form>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}

