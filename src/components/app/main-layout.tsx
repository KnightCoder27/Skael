
import type { ReactNode } from 'react';
import { Header } from '@/components/app/Header';
import { Footer } from '@/components/app/Footer';

export function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header />
      <main className="flex-1">
        <div className="container max-w-screen-2xl mx-auto py-6 sm:py-8 lg:py-10">
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
}
