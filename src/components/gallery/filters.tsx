"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

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

const INPUT_TYPES = [
  { value: "", label: "All Types" },
  { value: "text", label: "Text" },
  { value: "pdf", label: "PDF" },
  { value: "image", label: "Image" },
  { value: "video", label: "Video" },
];

const PAGE_SIZES = [
  { value: "", label: "All Sizes" },
  { value: "letter", label: "Letter" },
  { value: "a4", label: "A4" },
  { value: "tabloid", label: "Tabloid" },
  { value: "a3", label: "A3" },
];

interface GalleryFiltersProps {
  subjects?: string[];
}

export function GalleryFilters({ subjects = PREDEFINED_SUBJECTS }: GalleryFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSubject = searchParams.get("subject");
  const currentSort = searchParams.get("sort") || "recent";
  const currentInputType = searchParams.get("inputType") || "";
  const currentPageSize = searchParams.get("pageSize") || "";

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

  const handleInputTypeChange = (inputType: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (inputType === "") {
      params.delete("inputType");
    } else {
      params.set("inputType", inputType);
    }
    router.push(`/gallery?${params.toString()}`);
  };

  const handlePageSizeChange = (pageSize: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (pageSize === "") {
      params.delete("pageSize");
    } else {
      params.set("pageSize", pageSize);
    }
    router.push(`/gallery?${params.toString()}`);
  };

  return (
    <div className="mb-8 space-y-6">
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-medium mb-3 text-muted-foreground">Input Type</h3>
          <div className="flex flex-wrap gap-2">
            {INPUT_TYPES.map((type) => (
              <Button
                key={type.value}
                variant={(currentInputType === type.value) || (type.value === "" && !currentInputType) ? "default" : "outline"}
                size="sm"
                onClick={() => handleInputTypeChange(type.value)}
                className="transition-all duration-200"
              >
                {type.label}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium mb-3 text-muted-foreground">Paper Size</h3>
          <div className="flex flex-wrap gap-2">
            {PAGE_SIZES.map((size) => (
              <Button
                key={size.value}
                variant={(currentPageSize === size.value) || (size.value === "" && !currentPageSize) ? "default" : "outline"}
                size="sm"
                onClick={() => handlePageSizeChange(size.value)}
                className="transition-all duration-200"
              >
                {size.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

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
