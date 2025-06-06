
import type { ReactNode } from 'react';
import { Header } from '@/components/app/Header';
import { Footer } from '@/components/app/Footer';

export function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header />
      <main className="flex-1 my-4 py-8 sm:py-10 lg:py-10"> {/* Adjusted lg:py-12 to lg:py-10 */}
        <div
          className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-10" // Removed inline styles, added responsive padding
        >
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
}
