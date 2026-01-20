"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface SubjectSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

const PREDEFINED_SUBJECTS = [
  "Math", "Science", "History", "Literature", "Art", "Geography", "Computer Science", "Other"
];

export function SubjectSelector({ value, onChange }: SubjectSelectorProps) {
  const [showOtherInput, setShowOtherInput] = useState(false);
  const [otherValue, setOtherValue] = useState("");

  return (
    <div className="space-y-2">
      <Label>Subject *</Label>
      <div className="grid grid-cols-4 gap-2">
        {PREDEFINED_SUBJECTS.map((subject) => (
          <Button
            key={subject}
            variant={value === subject ? "default" : "outline"}
            size="sm"
            onClick={() => {
              onChange(subject);
              setShowOtherInput(subject === "Other");
            }}
          >
            {subject}
          </Button>
        ))}
      </div>
      {showOtherInput && (
        <input
          type="text"
          value={otherValue}
          onChange={(e) => { setOtherValue(e.target.value); onChange(e.target.value); }}
          placeholder="Enter subject..."
          className="mt-2 w-full px-3 py-2 border rounded-md"
        />
      )}
    </div>
  );
}
