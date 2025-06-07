
"use client";

import { useState } from 'react';
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
import { LogIn, UserPlus, Eye, EyeOff, Compass } from 'lucide-react';
import type { User } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

const USERS_LOCAL_STORAGE_KEY = 'app-users';

// Helper to get users from local storage
const getLocalUsers = (): User[] => {
  if (typeof window === 'undefined') return [];
  const usersJson = localStorage.getItem(USERS_LOCAL_STORAGE_KEY);
  return usersJson ? JSON.parse(usersJson) : [];
};

// Helper to save users to local storage
const saveLocalUsers = (users: User[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USERS_LOCAL_STORAGE_KEY, JSON.stringify(users));
};

// Schemas
const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }), // Password validation remains, but actual check is skipped for local
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
  const router = useRouter(); 
  const { setCurrentUser } = useAuth();
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
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });

  const onLoginSubmit: SubmitHandler<LoginFormValues> = async (data) => {
    try {
      const users = getLocalUsers();
      const user = users.find(u => u.email_id.toLowerCase() === data.email.toLowerCase());

      // In a real local storage auth, you might compare a hashed password.
      // For this mock, we'll assume if email exists, login is "successful".
      if (user) {
        setCurrentUser(user);
        toast({ title: "Login Successful", description: "Redirecting to job listings..." });
        router.push('/jobs');
      } else {
        toast({ 
          title: "Account Not Found", 
          description: "No account found with this email. Please register or check your email address.", 
          variant: "destructive" 
        });
      }
    } catch (error) {
      console.error("Error during login:", error);
      toast({ 
        title: "Login Failed", 
        description: "An unexpected error occurred during login.", 
        variant: "destructive" 
      });
    }
  };

  const onRegisterSubmit: SubmitHandler<RegisterFormValues> = async (data) => {
    try {
      let users = getLocalUsers();
      const existingUser = users.find(u => u.email_id.toLowerCase() === data.email.toLowerCase());

      if (existingUser) {
        toast({ title: "Registration Failed", description: "An account with this email already exists.", variant: "destructive" });
        return; 
      }

      const newUser: User = {
        id: Date.now().toString() + Math.random().toString(36).substring(2), // Simple unique ID
        user_name: data.name,
        email_id: data.email,
        // Password is not stored directly in this simplified local storage model
        professional_summary: "", 
        desired_job_role: "",   
        skills_list_text: "",
        location_string: "",
        joined_date: new Date().toISOString(),
      };
      
      users.push(newUser);
      saveLocalUsers(users);
      
      setCurrentUser(newUser);
      toast({ title: "Registration Successful", description: "Redirecting to profile setup..." });
      router.push('/profile');

    } catch (error) {
      console.error("Error during registration:", error);
      toast({ 
        title: "Registration Failed", 
        description: "An unexpected error occurred during registration.", 
        variant: "destructive" 
      });
    }
  };

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
                  <Link href="#" className="text-sm text-primary hover:underline" tabIndex={-1} onClick={(e) => { e.preventDefault(); toast({title: "Feature Coming Soon", description: "Password recovery will be available in a future update."}) }}>
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
                    <Button variant="link" className="p-0 h-auto text-primary" onClick={() => { 
                        const currentRegisterTab = document.querySelector('[data-state="active"][role="tab"][aria-selected="true"]');
                        if (currentRegisterTab && currentRegisterTab.getAttribute('data-value') === 'register') {
                             registerForm.reset();
                             loginForm.reset();
                        } else {
                            const trigger = document.querySelector('button[role="tab"][data-value="register"]') as HTMLButtonElement | null;
                            trigger?.click();
                        }
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
                        const currentLoginTab = document.querySelector('[data-state="active"][role="tab"][aria-selected="true"]');
                        if (currentLoginTab && currentLoginTab.getAttribute('data-value') === 'login') {
                            loginForm.reset();
                            registerForm.reset();
                        } else {
                            const trigger = document.querySelector('button[role="tab"][data-value="login"]') as HTMLButtonElement | null;
                            trigger?.click();
                        }
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
