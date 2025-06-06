"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Compass, Briefcase, User, LayoutDashboard, Settings } from 'lucide-react'; // Added Settings for potential future use

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/jobs', label: 'Job Explorer', icon: Compass },
  { href: '/tracker', label: 'Application Tracker', icon: Briefcase },
  { href: '/profile', label: 'My Profile', icon: User },
];

export function AppNavigation() {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="p-4 mb-4 border-b border-sidebar-border">
        <Link href="/" className="flex items-center gap-2 group">
          <Compass className="w-8 h-8 text-primary transition-transform duration-300 group-hover:rotate-12" />
          <span className="text-xl font-bold font-headline text-sidebar-primary-foreground">Career Compass</span>
        </Link>
      </div>
      <nav className="flex-grow px-3 py-4 space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-150 ease-in-out',
              'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus:outline-none focus:ring-2 focus:ring-sidebar-ring',
              pathname === item.href 
                ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm' 
                : 'text-sidebar-foreground hover:bg-sidebar-accent'
            )}
            aria-current={pathname === item.href ? 'page' : undefined}
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="p-3 mt-auto border-t border-sidebar-border">
        {/* Placeholder for user avatar or settings link */}
         <Link
            href="/profile" // Or a dedicated settings page
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-150 ease-in-out',
              'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus:outline-none focus:ring-2 focus:ring-sidebar-ring',
               pathname === '/settings' && 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm' 
            )}
          >
            <Settings className="w-5 h-5" />
            Settings
          </Link>
      </div>
    </div>
  );
}
