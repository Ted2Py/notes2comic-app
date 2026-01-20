"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

export function GalleryFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSubject = searchParams.get("subject");
  const currentSort = searchParams.get("sort") || "recent";

  const subjects = [
    "All",
    "Math",
    "Science",
    "History",
    "Literature",
    "Art",
    "Geography",
    "Computer Science",
  ];

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

  return (
    <div className="mb-8 space-y-4">
      <div className="flex flex-wrap gap-2">
        {subjects.map((subject) => (
          <Button
            key={subject}
            variant={currentSubject === subject || (subject === "All" && !currentSubject) ? "default" : "outline"}
            size="sm"
            onClick={() => handleSubjectChange(subject)}
          >
            {subject}
          </Button>
        ))}
      </div>

      <div className="flex gap-2">
        <Button
          variant={currentSort === "recent" ? "default" : "outline"}
          size="sm"
          onClick={() => handleSortChange("recent")}
        >
          Most Recent
        </Button>
        <Button
          variant={currentSort === "popular" ? "default" : "outline"}
          size="sm"
          onClick={() => handleSortChange("popular")}
        >
          Most Popular
        </Button>
      </div>
    </div>
  );
}
