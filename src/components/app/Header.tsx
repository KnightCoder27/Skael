
"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Compass, Briefcase, User, LogOut as LogOutIcon, LogIn, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { signOut } from 'firebase/auth';
import { auth as firebaseAuth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from './loading-spinner';

const navItemsLoggedIn = [
  { href: '/jobs', label: 'Job Listings', icon: Compass },
  { href: '/tracker', label: 'Application Tracker', icon: Briefcase },
  { href: '/profile', label: 'My Profile', icon: User },
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, isLoadingAuth, setIsLoggingOut, setBackendUser, isLoggingOut } = useAuth();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const { toast } = useToast();

  const handleLogout = async () => {
    console.log("Header: handleLogout initiated.");
    setIsLoggingOut(true);
    setBackendUser(null); // Proactively clear user state

    try {
      console.log("Header: Attempting Firebase signOut...");
      await signOut(firebaseAuth);
      console.log("Header: Firebase signOut successful.");
      
      router.push('/auth');
      // setIsLoggingOut(false) is now handled by AuthContext upon Firebase confirming logout (fbUser === null)
      toast({ title: "Logged Out", description: "You have been successfully logged out." });
      setIsSheetOpen(false);
    } catch (error) {
      console.error("Header: Error signing out from Firebase: ", error);
      toast({ title: "Logout Failed", description: "Could not log you out. Please try again.", variant: "destructive" });
      setIsLoggingOut(false); // Reset on error as a fallback
    }
  };


  const NavLink = ({ href, children, icon: Icon, onClick }: { href: string; children: React.ReactNode; icon: React.ElementType, onClick?: () => void }) => (
    <Link
      href={href}
      onClick={() => {
        setIsSheetOpen(false);
        if (onClick) onClick();
      }}
      className={cn(
        'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors',
        pathname === href
          ? 'bg-primary/10 text-primary'
          : 'text-foreground/70 hover:text-primary hover:bg-primary/5',
        'md:text-foreground/70 md:hover:text-primary md:hover:bg-transparent md:dark:hover:bg-transparent md:dark:hover:text-primary'
      )}
      aria-current={pathname === href ? 'page' : undefined}
    >
      <Icon className="w-5 h-5" />
      {children}
    </Link>
  );

  const renderNavLinks = (isMobileSheet = false) => {
    if (isLoggingOut) {
        return (
            <div className={cn(
                "flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground",
                isMobileSheet ? "justify-start" : ""
            )}>
                <LoadingSpinner size={16} />
                <span>Logging out...</span>
            </div>
        );
    }
    
    if (isLoadingAuth) { 
        return (
            <div className={cn(
                "flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground",
                isMobileSheet ? "justify-start" : ""
            )}>
                <LoadingSpinner size={16} />
                <span>Loading...</span>
            </div>
        );
    }

    if (currentUser) {
      return (
        <>
          {navItemsLoggedIn.map((item) => (
            <NavLink key={item.href} href={item.href} icon={item.icon}>
              {item.label}
            </NavLink>
          ))}
          <Button
            variant={isMobileSheet ? "ghost" : "link"}
            size={isMobileSheet ? "default" : "sm"}
            onClick={handleLogout}
            className={cn(
              'flex items-center gap-2 text-sm font-medium',
               isMobileSheet
                ? 'text-foreground/70 hover:text-primary hover:bg-primary/5 w-full justify-start px-3 py-2'
                : 'text-foreground/70 hover:text-primary p-0 md:px-3 md:py-2'
            )}
            disabled={isLoggingOut}
          >
            <LogOutIcon className="w-5 h-5" />
            Logout
          </Button>
        </>
      );
    }
    else {
      return (
        <NavLink href="/auth" icon={LogIn}>Login / Register</NavLink>
      );
    }
  };


  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between max-w-screen-2xl">
        <Link href="/" className="flex items-center gap-2 group mr-6" onClick={() => setIsSheetOpen(false)}>
          <Compass className="w-7 h-7 text-primary transition-transform duration-300 group-hover:rotate-12" />
          <span className="text-xl font-bold font-brand text-primary">Skael</span>
        </Link>

        <nav className="hidden md:flex items-center space-x-2 lg:space-x-4">
          {renderNavLinks()}
        </nav>

        <div className="md:hidden">
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" disabled={isLoggingOut}>
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] p-0 pt-6">
              <SheetHeader className="px-4 pb-2 border-b mb-2">
                <SheetTitle className="text-lg font-semibold font-brand text-primary">Skael Menu</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col space-y-2 px-4">
                {renderNavLinks(true)}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
