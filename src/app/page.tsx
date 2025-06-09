
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle, FileText, SearchCheck, Sparkles, Target } from "lucide-react";

export default function LandingPage() {
  const features = [
    {
      icon: <SearchCheck className="h-10 w-10 text-primary mb-4" />,
      title: "Discover Relevant Jobs",
      description: "No more missing out or chasing promoted jobs with thousands of applications. Find real opportunities tailored to you.",
    },
    {
      icon: <FileText className="h-10 w-10 text-primary mb-4" />,
      title: "ATS-Friendly Applications",
      description: "Create resumes and cover letters that actually get noticed by applicant tracking systems and hiring managers.",
    },
    {
      icon: <Target className="h-10 w-10 text-primary mb-4" />,
      title: "Personalized AI Matches",
      description: "Get job suggestions based on your unique profile, skills, and preferences, powered by intelligent AI.",
    },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-background to-card">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="text-center md:text-left">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-primary mb-6 leading-tight font-headline">
                Find Your Dream Job, <span className="block md:inline">Without the Hassle.</span>
              </h1>
              <p className="text-lg md:text-xl text-foreground/80 mb-8 max-w-xl mx-auto md:mx-0">
                Tired of juggling a dozen job boards and wondering if your resume stands a chance? Our AI-powered Job Hunter simplifies your search.
              </p>
              <Button asChild size="lg" className="shadow-lg hover:shadow-xl transition-shadow duration-300">
                <Link href="/auth">
                  Let's Get Started <Sparkles className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
            <div>
              <Image
                src="https://placehold.co/600x700.png"
                alt="Modern building representing career opportunities"
                width={600}
                height={700}
                className="rounded-xl shadow-2xl object-cover mx-auto"
                data-ai-hint="modern office building"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* Problem/Why Section */}
      <section className="py-16 md:py-20 bg-background">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 font-headline">
            Job Hunting Can Be Overwhelming. <span className="text-primary">You're Not Alone.</span>
          </h2>
          <p className="text-md md:text-lg text-foreground/70 leading-relaxed">
            Getting lost in endless listings, customizing countless resumes, and facing uncertainty is frustrating. 
            Career Compass AI is designed to cut through the noise and guide you to success.
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-20 bg-card">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-primary mb-3 font-headline">
              How Our AI-Powered Platform Helps You
            </h2>
            <p className="text-md md:text-lg text-foreground/70 max-w-2xl mx-auto">
              Leverage the power of artificial intelligence to streamline every step of your job search.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="text-center p-6 md:p-8 shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col bg-background hover:border-primary">
                <div className="flex justify-center items-center mb-4">
                  {feature.icon}
                </div>
                <CardHeader className="p-0 mb-2">
                  <CardTitle className="text-xl font-semibold text-foreground font-headline">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent className="p-0 flex-grow">
                  <p className="text-foreground/70">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA Section */}
      <section className="py-20 md:py-28 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 font-headline">
            Say Goodbye to Job Search Frustration.
          </h2>
          <p className="text-lg md:text-xl mb-8 max-w-2xl mx-auto text-primary-foreground/90">
            Job hunting just got smart, simple, and you-focused. Take control of your career path today.
          </p>
          <Button asChild size="lg" variant="secondary" className="shadow-lg hover:shadow-xl transition-shadow duration-300 text-lg py-3 px-8 bg-card text-primary hover:bg-card/90">
            <Link href="/auth">
              Start Your Smart Search Now
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
