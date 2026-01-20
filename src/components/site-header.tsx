"use client";

import Link from "next/link";
import { BookOpen, Home, Sparkles, User } from "lucide-react";
import { UserProfile } from "@/components/auth/user-profile";
import { useSession } from "@/lib/auth-client";
import { ModeToggle } from "./ui/mode-toggle";

export function SiteHeader() {
  const { data: session } = useSession();

  const navLinks = [
    { href: "/", label: "Home", icon: Home },
    { href: "/create", label: "Create", icon: Sparkles },
    { href: "/gallery", label: "Gallery", icon: BookOpen },
  ];

  const dashboardLink = session ? "/dashboard" : "/register";

  return (
    <>
      {/* Skip to main content link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-background focus:text-foreground focus:border focus:rounded-md"
      >
        Skip to main content
      </a>

      {/* Comic-style top navigation bar */}
      <header className="border-b-4 border-foreground bg-secondary sticky top-0 z-50">
        {/* Top accent bar */}
        <div className="h-2 bg-primary"></div>
        <div className="h-1 bg-accent"></div>

        <nav
          className="container mx-auto px-4 py-4"
          aria-label="Main navigation"
        >
          <div className="flex items-center justify-between gap-4">
            {/* Logo - Comic box style */}
            <div className="flex-1">
              <Link
                href="/"
                className="comic-border group !border-4 !px-6 !py-3 bg-card hover:scale-105 transition-transform inline-flex"
                aria-label="Notes2Comic - Go to homepage"
              >
              <div className="flex items-center gap-3">
                <div
                  className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary border-2 border-foreground"
                  aria-hidden="true"
                >
                  <BookOpen className="h-6 w-6 text-primary-foreground" />
                </div>
                <div className="text-left">
                  <span className="block text-2xl font-bold leading-none">
                    Notes2Comic
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    Pow! Zap! Learn!
                  </span>
                </div>
              </div>
            </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="comic-border px-4 py-2 bg-card hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all font-bold flex items-center gap-2"
                >
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </Link>
              ))}
            </div>

            {/* User actions */}
            <div className="flex-1 flex items-center justify-end gap-3" role="group" aria-label="User actions">
              <Link
                href={dashboardLink}
                className="comic-border px-4 py-2 bg-accent text-accent-foreground hover:scale-105 transition-transform font-bold hidden md:flex items-center gap-2"
              >
                <User className="h-4 w-4" />
                Dashboard
              </Link>
              <div className="comic-border bg-background p-1">
                <ModeToggle />
              </div>
              <div className="comic-border bg-background p-1">
                <UserProfile />
              </div>
            </div>
          </div>

          {/* Mobile Navigation */}
          <div className="flex md:hidden items-center justify-center gap-2 mt-4 pb-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="comic-border px-3 py-2 bg-card hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all font-bold flex items-center gap-2 text-sm"
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </Link>
            ))}
          </div>
        </nav>

        {/* Bottom accent bars */}
        <div className="h-1 bg-accent"></div>
        <div className="h-2 bg-primary"></div>
      </header>
    </>
  );
}
