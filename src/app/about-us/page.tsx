
import { Users, Target, Lightbulb, Zap } from "lucide-react";
import Image from "next/image";

export default function AboutUsPage() {
  const lastUpdatedDate = "July 26, 2024"; // Placeholder date

  return (
    <div className="container mx-auto py-12 px-4 md:px-6">
      <header className="mb-12 text-center">
        <Users className="w-16 h-16 text-primary mx-auto mb-4" />
        <h1 className="text-4xl md:text-5xl font-extrabold text-primary mb-3 font-headline">
          About Skael
        </h1>
        <p className="text-lg md:text-xl text-foreground/80 max-w-2xl mx-auto">
          Discover the story behind Skael and our commitment to revolutionizing your career advancement.
        </p>
      </header>

      <section className="mb-12">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div>
            <Image
              src="https://placehold.co/600x400.png"
              alt="Team collaborating at Skael"
              width={600}
              height={400}
              className="rounded-xl shadow-lg object-cover"
              data-ai-hint="team collaboration office"
            />
          </div>
          <div className="prose prose-lg text-foreground/90">
            <h2 className="text-3xl font-semibold text-primary mb-4 flex items-center">
              <Target className="w-7 h-7 mr-3 text-primary" /> Our Mission
            </h2>
            <p>
              At Skael, our mission is to empower job seekers by providing intelligent, intuitive, and effective tools that simplify the complexities of the job market. We believe that everyone deserves to find a fulfilling career, and our AI-driven platform is designed to make that a reality.
            </p>
            <p>
              [Elaborate on the core purpose and aimg of Skael. What problems do you solve for users? Focus on user benefits and impact. Keywords: career empowerment, job search simplification, AI job matching.]
            </p>
          </div>
        </div>
      </section>

      <section className="mb-12 bg-card p-8 rounded-xl shadow-md">
        <div className="prose prose-lg max-w-none text-foreground/90">
          <h2 className="text-3xl font-semibold text-primary mb-4 flex items-center">
            <Lightbulb className="w-7 h-7 mr-3 text-primary" /> Our Vision
          </h2>
          <p>
            We envision a future where finding the right job is not a stressful ordeal but an exciting journey of discovery and growth. Skael aims to be the leading global platform for AI-powered career navigation, connecting talent with opportunity seamlessly and efficiently.
          </p>
          <p>
            [Describe the long-term aspiration of Skael. Where do you see the company and its impact in the future? Keywords: future of work, AI career guidance, global talent solutions.]
          </p>
        </div>
      </section>

      <section className="mb-12">
        <div className="prose prose-lg max-w-3xl mx-auto text-foreground/90 text-center">
            <h2 className="text-3xl font-semibold text-primary mb-6 flex items-center justify-center">
                <Zap className="w-7 h-7 mr-3 text-primary" /> The Skael Difference
            </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-8 mt-6">
            <div className="bg-background p-6 rounded-lg shadow-sm border border-border">
                <h3 className="text-xl font-semibold text-primary mb-2">Intelligent Matching</h3>
                <p>[Explain how your AI provides superior job matching. Keywords: smart algorithms, personalized recommendations, skill-based matching.]</p>
            </div>
            <div className="bg-background p-6 rounded-lg shadow-sm border border-border">
                <h3 className="text-xl font-semibold text-primary mb-2">User-Centric Design</h3>
                <p>[Highlight the focus on user experience. Keywords: intuitive interface, easy navigation, accessible tools.]</p>
            </div>
            <div className="bg-background p-6 rounded-lg shadow-sm border border-border">
                <h3 className="text-xl font-semibold text-primary mb-2">Comprehensive Support</h3>
                <p>[Detail the tools and support offered beyond just listings. Keywords: resume builder, cover letter generator, application tracking.]</p>
            </div>
        </div>
      </section>

      <section className="mb-12 text-center">
        <h2 className="text-3xl font-semibold text-primary mb-4">Our Team (Placeholder)</h2>
        <p className="text-foreground/70 max-w-xl mx-auto">
          Skael is powered by a passionate team of innovators, engineers, and career experts dedicated to your success.
        </p>
        <p className="text-foreground/70 max-w-xl mx-auto mt-2">
          [This section can later be updated with information about the team, their expertise, and perhaps photos or profiles. Keywords: experienced team, AI experts, career coaches.]
        </p>
        <div className="mt-6">
            <Image
              src="https://placehold.co/800x300.png"
              alt="Placeholder for team image or graphic"
              width={800}
              height={300}
              className="rounded-xl shadow-lg object-cover mx-auto"
              data-ai-hint="diverse team working"
            />
        </div>
      </section>

      <section className="text-center py-10 bg-primary text-primary-foreground rounded-xl">
        <h2 className="text-3xl font-semibold mb-4">Join Us on Your Career Journey</h2>
        <p className="max-w-xl mx-auto mb-6 text-primary-foreground/90">
          Ready to take the next step in your career? Let Skael be your guide.
        </p>
        <Button asChild variant="secondary" size="lg" className="bg-card text-primary hover:bg-card/90">
          <Link href="/auth">Get Started with Skael</Link>
        </Button>
      </section>

      <footer className="mt-12 pt-8 border-t border-border text-center">
        <p className="text-sm text-muted-foreground">
          For inquiries, please visit our <Link href="/contact-us" className="text-primary hover:underline">Contact Page (Placeholder)</Link>.
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Skael | Last Updated: {lastUpdatedDate}
        </p>
      </footer>
    </div>
  );
}
