"use client";

import React, { useCallback } from "react";
import { Upload } from "lucide-react";
import { useDropzone } from "react-dropzone";

interface FileUploaderProps {
  onUpload: (file: File) => Promise<void>;
}

export function FileUploader({ onUpload }: FileUploaderProps) {
  const [uploading, setUploading] = React.useState(false);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        if (file) {
          setUploading(true);
          try {
            await onUpload(file);
          } finally {
            setUploading(false);
          }
        }
      }
    },
    [onUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "image/*": [".png", ".jpg", ".jpeg", ".webp"],
      "video/*": [".mp4", ".mov"],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
        isDragActive
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/25 hover:border-primary/50"
      }`}
    >
      <input {...getInputProps()} />
      {uploading ? (
        <p className="text-muted-foreground">Uploading...</p>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-center">
            <Upload className="h-12 w-12 text-muted-foreground" />
          </div>
          <div>
            <p className="text-lg font-medium mb-2">
              {isDragActive ? "Drop your file here" : "Upload your notes"}
            </p>
            <p className="text-sm text-muted-foreground">
              PDF, images, or videos up to 10MB
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
