
import type { ReactNode } from 'react';
import { Header } from '@/components/app/Header';
import { Footer } from '@/components/app/Footer';

export function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header />
      <main className="flex-1 my-4 py-8 sm:py-10 lg:py-12"> {/* Removed Tailwind horizontal padding classes */}
        <div
          className="max-w-screen-2xl mx-auto"
          style={{ paddingLeft: '1rem', paddingRight: '1rem' }} // Added inline CSS for horizontal padding
        >
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
}
