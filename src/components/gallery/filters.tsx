"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

const PREDEFINED_SUBJECTS = [
  "All",
  "Math",
  "Science",
  "History",
  "Literature",
  "Art",
  "Geography",
  "Computer Science",
];

interface GalleryFiltersProps {
  subjects?: string[];
}

export function GalleryFilters({ subjects = PREDEFINED_SUBJECTS }: GalleryFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSubject = searchParams.get("subject");
  const currentSort = searchParams.get("sort") || "recent";
  const currentSearch = searchParams.get("search") || "";

  const handleSubjectChange = (subject: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (subject === "All") {
      params.delete("subject");
    } else {
      params.set("subject", subject);
    }
    router.push(`/gallery?${params.toString()}`);
  };

  const handleSortChange = (sort: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", sort);
    router.push(`/gallery?${params.toString()}`);
  };

  const handleSearchChange = (search: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (search.trim() === "") {
      params.delete("search");
    } else {
      params.set("search", search);
    }
    router.push(`/gallery?${params.toString()}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Search is already handled by the onChange, this just prevents form submission
  };

  return (
    <div className="mb-8 space-y-6">
      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search comics by title, subject, or tags..."
          value={currentSearch}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-10"
        />
      </form>

      {/* Subject Filter */}
      <div>
        <h3 className="text-sm font-medium mb-3 text-muted-foreground">Filter by Subject</h3>
        <div className="flex flex-wrap gap-2">
          {subjects.map((subject) => (
            <Button
              key={subject}
              variant={currentSubject === subject || (subject === "All" && !currentSubject) ? "default" : "outline"}
              size="sm"
              onClick={() => handleSubjectChange(subject)}
              className="transition-all duration-200"
            >
              {subject}
            </Button>
          ))}
        </div>
      </div>

      {/* Sort By */}
      <div>
        <h3 className="text-sm font-medium mb-3 text-muted-foreground">Sort By</h3>
        <div className="flex gap-2">
          <Button
            variant={currentSort === "recent" ? "default" : "outline"}
            size="sm"
            onClick={() => handleSortChange("recent")}
            className="transition-all duration-200"
          >
            Most Recent
          </Button>
          <Button
            variant={currentSort === "popular" ? "default" : "outline"}
            size="sm"
            onClick={() => handleSortChange("popular")}
            className="transition-all duration-200"
          >
            Most Popular
          </Button>
        </div>
      </div>
    </div>
  );
}
