import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t-4 border-foreground bg-secondary text-center text-sm">
      {/* Top accent bars */}
      <div className="h-2 bg-primary"></div>
      <div className="h-1 bg-accent"></div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center space-y-4">
          {/* Navigation links */}
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/create"
              className="comic-border px-4 py-2 bg-card hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all font-bold"
            >
              Create
            </Link>
            <Link
              href="/gallery"
              className="comic-border px-4 py-2 bg-card hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all font-bold"
            >
              Gallery
            </Link>
            <Link
              href="/dashboard"
              className="comic-border px-4 py-2 bg-card hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all font-bold"
            >
              Dashboard
            </Link>
          </div>

          {/* Tagline */}
          <div className="comic-border !py-3 !px-6 bg-primary text-primary-foreground">
            <p className="text-lg font-bold">
              Transform learning into visual adventures!
            </p>
          </div>

          {/* Copyright */}
          <p className="text-black font-medium">
            © {new Date().getFullYear()} Notes2Comic. Pow! Zap! Learn!
          </p>
        </div>
      </div>

      {/* Bottom accent bars */}
      <div className="h-1 bg-accent"></div>
      <div className="h-2 bg-primary"></div>
    </footer>
  );
}
