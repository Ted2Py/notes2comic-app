import Link from "next/link";
import { Sparkles, BookOpen, Users, Heart } from "lucide-react";
import { ExampleShowcase } from "@/components/landing/example-showcase";
import { HeroComic } from "@/components/landing/hero-comic";
import { HowItWorks } from "@/components/landing/how-it-works";
import { MostLikedComics } from "@/components/landing/most-liked-comics";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="flex-1">
      {/* Hero Section */}
      <section className="w-full py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                <Sparkles className="h-4 w-4" />
                Powered by Google Cloud Gemini AI
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                Turn Your Notes Into{" "}
                <span className="text-primary block">
                  Engaging Comics
                </span>
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed">
                Transform boring study materials into fun, visual comic strips.
                Upload your notes, PDFs, images, or videos and let AI create
                memorable educational content that actually sticks.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button size="lg" className="text-base" asChild>
                  <Link href="/create">
                    <Sparkles className="h-5 w-5 mr-2" />
                    Get Started Free
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="text-base" asChild>
                  <Link href="/gallery">
                    <BookOpen className="h-5 w-5 mr-2" />
                    View Gallery
                  </Link>
                </Button>
              </div>
            </div>
            <HeroComic />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="w-full bg-muted/30 py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              How It Works
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Three simple steps to transform your learning experience
            </p>
          </div>
          <HowItWorks />
        </div>
      </section>

      {/* Example Showcase */}
      <section className="w-full py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              See the Transformation
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Watch how dry notes become exciting visual stories
            </p>
          </div>
          <ExampleShowcase />
        </div>
      </section>

      {/* Most Liked Comics */}
      <section className="w-full bg-muted/30 py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/10 text-pink-500 text-sm font-medium mb-4">
              <Heart className="h-4 w-4 fill-current" />
              Community Favorites
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Most Loved Comics
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Check out the most popular creations from our community
            </p>
          </div>
          <MostLikedComics />
        </div>
      </section>

      {/* Features Grid */}
      <section className="w-full py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything You Need
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Powerful features to make learning visual and fun
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: "📄",
              title: "Multiple Input Formats",
              description: "Upload text, PDFs, images, or videos up to 10MB",
            },
            {
              icon: "🎨",
              title: "Custom Art Styles",
              description: "Choose from retro, manga, minimal, or pixel art styles",
            },
            {
              icon: "🔄",
              title: "Regenerate Panels",
              description: "Not happy with a panel? Regenerate it instantly",
            },
            {
              icon: "📤",
              title: "Export to PDF",
              description: "Download your comics to share or print",
            },
            {
              icon: "🌐",
              title: "Public Gallery",
              description: "Share your comics and discover others' creations",
            },
            {
              icon: "⚡",
              title: "AI-Powered",
              description: "Google Cloud Gemini analyzes and creates engaging content",
            },
          ].map((feature, index) => (
            <div
              key={index}
              className="p-6 rounded-xl border bg-card hover:border-primary/50 transition-colors"
            >
              <div className="text-3xl mb-3">{feature.icon}</div>
              <h3 className="font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
      </section>

      {/* CTA Section */}
      <section className="w-full bg-muted/30 py-16 md:py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center bg-gradient-to-br from-primary/10 via-primary/5 to-primary/10 rounded-2xl border border-primary/20 p-8 md:p-12">
            <Users className="h-12 w-12 text-primary mx-auto mb-4" />
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Make Learning Fun?
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Join thousands of students who are learning visually and retaining more than ever before
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="text-base" asChild>
                <Link href="/create">
                  <Sparkles className="h-5 w-5 mr-2" />
                  Create Your First Comic
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="text-base" asChild>
                <Link href="/register">
                  Sign Up Free
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
