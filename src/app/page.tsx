import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, Compass, Briefcase, UserCheck } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <section className="py-12 bg-gradient-to-br from-primary/10 via-background to-background rounded-lg shadow-sm">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold font-headline mb-4 text-primary">
            Welcome to Career Compass AI
          </h1>
          <p className="text-lg md:text-xl text-foreground/80 max-w-2xl mx-auto mb-8">
            Your intelligent assistant for navigating the job market. Discover tailored opportunities, craft perfect applications, and track your progress seamlessly.
          </p>
          <div className="flex justify-center gap-4">
            <Button asChild size="lg" className="shadow-md hover:shadow-lg transition-shadow">
              <Link href="/jobs">
                Explore Jobs <Compass className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="shadow-md hover:shadow-lg transition-shadow">
              <Link href="/profile">
                Update Profile <UserCheck className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-headline">
              <Compass className="text-primary" /> Smart Job Matching
            </CardTitle>
            <CardDescription>
              AI-powered suggestions based on your profile and preferences.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground/90 mb-4">
              Let our AI find the best job opportunities for you, complete with match scores and detailed explanations.
            </p>
            <Button variant="link" asChild className="p-0 h-auto text-primary">
              <Link href="/jobs">
                Discover Matches <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-headline">
              <Briefcase className="text-primary" /> Application Tracker
            </CardTitle>
            <CardDescription>
              Manage your job search process in one place.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground/90 mb-4">
              Save interesting jobs, track application statuses, and stay organized throughout your job hunt.
            </p>
            <Button variant="link" asChild className="p-0 h-auto text-primary">
              <Link href="/tracker">
                View Tracker <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-headline">
              <UserCheck className="text-primary" /> Tailored Materials
            </CardTitle>
            <CardDescription>
              Generate ATS-friendly resumes and cover letters.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground/90 mb-4">
              Create customized application materials tailored to specific job descriptions and your unique profile.
            </p>
             <Button variant="link" asChild className="p-0 h-auto text-primary">
              <Link href="/jobs"> {/* Materials are generated from job listings */}
                Start Generating <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
