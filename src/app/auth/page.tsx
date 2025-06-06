
"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation'; // Import useRouter
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { LogIn, UserPlus, Eye, EyeOff, Compass } from 'lucide-react';
import useLocalStorage from '@/hooks/use-local-storage'; // Import useLocalStorage
import type { UserProfileData } from '@/types'; // Import UserProfileData type

// Schemas
const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});
type LoginFormValues = z.infer<typeof loginSchema>;

const registerSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }).max(50, {message: "Name cannot exceed 50 characters."}),
  email: z.string().email({ message: "Invalid email address." }),
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
  const router = useRouter(); // Initialize useRouter
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [, setUserProfile] = useLocalStorage<UserProfileData | null>('user-profile', null); // For setting profile on register
  
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterConfirmPassword, setShowRegisterConfirmPassword] = useState(false);

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });

  const onLoginSubmit: SubmitHandler<LoginFormValues> = (data) => {
    console.log("Login data:", data);
    // TODO: Implement actual login logic with Firebase Auth or other provider
    // For now, simulate login by setting a dummy profile and redirecting
    setUserProfile({ rawText: `Logged in as ${data.email}`, preferences: "No preferences set yet.", name: "User", email: data.email });
    toast({ title: "Login Successful (Simulated)", description: "Redirecting to job listings..." });
    router.push('/jobs'); // Redirect to Job Listings page
  };

  const onRegisterSubmit: SubmitHandler<RegisterFormValues> = (data) => {
    console.log("Register data:", data);
    // TODO: Implement actual registration logic with Firebase Auth or other provider
    // For now, simulate registration by creating a basic profile and redirecting
    const newProfile: UserProfileData = {
      rawText: "", // Empty, user will fill this in profile setup
      preferences: "", // Empty
      name: data.name,
      email: data.email,
      // location: "" // Location can be added later in profile setup
    };
    setUserProfile(newProfile);
    toast({ title: "Registration Successful (Simulated)", description: "Redirecting to profile setup..." });
    router.push('/profile'); // Redirect to Profile Setup page
  };

  const toggleShowLoginPassword = () => setShowLoginPassword(!showLoginPassword);
  const toggleShowRegisterPassword = () => setShowRegisterPassword(!showRegisterPassword);
  const toggleShowRegisterConfirmPassword = () => setShowRegisterConfirmPassword(!showRegisterConfirmPassword);

  return (
    <div className="flex min-h-[calc(100vh-12rem)] flex-col items-center justify-center p-4"> {/* Adjusted min-h for header/footer */}
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
                {activeTab === 'login' ? 'Sign in to access your career dashboard.' : 'Join Job Hunter AI to find your path.'}
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
                  <Link href="#" className="text-sm text-primary hover:underline">
                    Forgot password?
                  </Link>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-4 pt-2">
                <Button type="submit" className="w-full" disabled={loginForm.formState.isSubmitting}>
                  {loginForm.formState.isSubmitting ? 'Logging in...' : 'Login'}
                  {!loginForm.formState.isSubmitting && <LogIn className="ml-2 h-4 w-4" />}
                </Button>
                 <p className="text-center text-sm text-muted-foreground">
                    Don't have an account?{" "}
                    <Button variant="link" className="p-0 h-auto text-primary" onClick={() => { setActiveTab('register'); loginForm.reset(); registerForm.reset();}}>
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
                  {registerForm.formState.isSubmitting ? 'Creating Account...' : 'Create Account'}
                  {!registerForm.formState.isSubmitting && <UserPlus className="ml-2 h-4 w-4" />}
                </Button>
                <p className="px-6 text-center text-xs text-muted-foreground">
                    By clicking Create Account, you agree to our{" "}
                    <Link href="/terms" className="underline underline-offset-4 hover:text-primary">
                        Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link href="/privacy" className="underline underline-offset-4 hover:text-primary">
                        Privacy Policy
                    </Link>
                    .
                </p>
                 <p className="text-center text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <Button variant="link" className="p-0 h-auto text-primary" onClick={() => { setActiveTab('login'); registerForm.reset(); loginForm.reset();}}>
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
