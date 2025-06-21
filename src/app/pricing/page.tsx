
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Zap, TrendingUp, Rocket, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

interface PricingPlan {
  name: string;
  id: string;
  price: string;
  priceSuffix?: string;
  description: string;
  features: { text: string; unavailable?: boolean }[];
  jobGenerate: string;
  resumeGenCount: string;
  coverLetterCount: string;
  additionalFeature: string;
  ctaText: string;
  ctaLink: string;
  isPopular?: boolean;
}

const plans: PricingPlan[] = [
  {
    name: "Start (Free)",
    id: "start",
    price: "₹0",
    description: "Perfect for getting started and exploring core features.",
    features: [
      { text: "Basic Job Matching" },
      { text: "Application Tracking" },
    ],
    jobGenerate: "3/Month",
    resumeGenCount: "1/Month",
    coverLetterCount: "1/Month",
    additionalFeature: "None",
    ctaText: "Get Started",
    ctaLink: "/auth",
  },
  {
    name: "Grow",
    id: "grow",
    price: "₹249",
    priceSuffix: "/ month",
    description: "For active job seekers needing more power and insights.",
    features: [
      { text: "Enhanced Job Matching" },
      { text: "Advanced Application Tracking" },
      { text: "Priority Support (Email)" },
    ],
    jobGenerate: "20/Month",
    resumeGenCount: "10/Month",
    coverLetterCount: "10/Month",
    additionalFeature: "Access to Additional Relevant Jobs",
    ctaText: "Choose Grow",
    ctaLink: "/auth?plan=grow", // Example, can link to payment/checkout
    isPopular: true,
  },
  {
    name: "Skael",
    id: "skael",
    price: "₹499",
    priceSuffix: "/ month",
    description: "The ultimate plan for professionals who want it all.",
    features: [
      { text: "Premium Job Matching & Insights" },
      { text: "Comprehensive Application Tools" },
      { text: "Dedicated Support" },
      { text: "Early Access to New Features" },
    ],
    jobGenerate: "50/Month",
    resumeGenCount: "Unlimited",
    coverLetterCount: "Unlimited",
    additionalFeature: "Additional Relevant Jobs & Full Job Database Access",
    ctaText: "Go Skael",
    ctaLink: "/auth?plan=skael", // Example
  },
];

export default function PricingPage() {
  const { currentUser } = useAuth();

  const getPlanIcon = (planId: string) => {
    if (planId === "start") return <Zap className="w-8 h-8 text-primary mb-3" />;
    if (planId === "grow") return <TrendingUp className="w-8 h-8 text-primary mb-3" />;
    if (planId === "skael") return <Rocket className="w-8 h-8 text-primary mb-3" />;
    return <ShieldCheck className="w-8 h-8 text-primary mb-3" />;
  };

  return (
    <div className="container mx-auto py-12 px-4 md:px-6">
      <header className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-extrabold text-primary mb-4 font-headline">
          Find the Perfect Plan for Your Career Journey
        </h1>
        <p className="text-lg md:text-xl text-foreground/80 max-w-2xl mx-auto">
          Choose the Skael plan that best suits your job search needs and accelerate your path to success.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            className={`flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-xl border-2 ${
              plan.isPopular ? "border-primary ring-2 ring-primary/50" : "border-border"
            } bg-card`}
          >
            {plan.isPopular && (
              <div className="text-center py-1.5 px-4 bg-primary text-primary-foreground text-xs font-semibold rounded-t-lg -mt-px">
                MOST POPULAR
              </div>
            )}
            <CardHeader className="text-center pt-8 pb-4">
              <div className="flex justify-center">{getPlanIcon(plan.id)}</div>
              <CardTitle className="text-2xl font-bold font-headline text-foreground">{plan.name}</CardTitle>
              <div className="mt-2">
                <span className="text-4xl font-extrabold text-primary">{plan.price}</span>
                {plan.priceSuffix && <span className="text-sm text-muted-foreground ml-1">{plan.priceSuffix}</span>}
              </div>
              <CardDescription className="mt-3 text-foreground/70 min-h-[40px]">{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow space-y-3 px-6 pb-6">
              <div className="space-y-1.5 text-sm text-foreground/90">
                <p><span className="font-semibold">Job Generation:</span> {plan.jobGenerate}</p>
                <p><span className="font-semibold">Resume Generations:</span> {plan.resumeGenCount}</p>
                <p><span className="font-semibold">Cover Letter Generations:</span> {plan.coverLetterCount}</p>
                <p><span className="font-semibold">Key Feature:</span> {plan.additionalFeature}</p>
              </div>
              <ul className="space-y-2 pt-3">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <CheckCircle className={`w-5 h-5 mr-2 mt-0.5 shrink-0 ${feature.unavailable ? 'text-muted-foreground/50' : 'text-green-500'}`} />
                    <span className={feature.unavailable ? 'text-muted-foreground/70 line-through' : 'text-foreground/90'}>
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter className="p-6 mt-auto">
              <Button
                asChild
                className={`w-full text-lg py-3 ${plan.isPopular ? "bg-primary hover:bg-primary/90 text-primary-foreground" : "bg-secondary hover:bg-secondary/90 text-secondary-foreground"}`}
                size="lg"
              >
                <Link href={currentUser ? (plan.id === 'start' ? '/jobs' : '/profile') : plan.ctaLink}>
                  {plan.ctaText}
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <section className="text-center mt-16 py-8 bg-muted/50 rounded-lg">
        <h2 className="text-2xl font-semibold text-primary mb-3">Not Sure Which Plan to Choose?</h2>
        <p className="text-foreground/70 mb-6 max-w-xl mx-auto">
          Start with our Free plan to experience the core benefits of Skael. You can always upgrade as your needs grow.
        </p>
        <Button asChild variant="outline" size="lg">
          <Link href="/contact-us">Contact Sales (Placeholder)</Link>
        </Button>
      </section>
    </div>
  );
}
