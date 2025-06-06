import type { ReactNode } from 'react';
import { AppNavigation } from '@/components/app/navigation';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';

export function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="w-64 fixed inset-y-0 left-0 z-10 hidden md:block">
        <AppNavigation />
      </aside>
      <div className="md:pl-64 flex-1 flex flex-col">
        <header className="sticky top-0 z-0 md:hidden flex h-14 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 lg:h-[60px] lg:px-6">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="shrink-0 md:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle navigation menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64">
                <AppNavigation />
              </SheetContent>
            </Sheet>
            {/* Optional: Add breadcrumbs or page title here for mobile */}
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <div className="max-w-full mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
