"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Sparkles, AlertCircle } from "lucide-react";
import { OutputFormatSelector } from "@/components/comic/output-format-selector";
import { PanelCountSelector } from "@/components/comic/panel-count-selector";
import { PanelLoading } from "@/components/comic/panel-loading";
import { StyleSelector } from "@/components/comic/style-selector";
import { SubjectSelector } from "@/components/comic/subject-selector";
import { ToneSelector } from "@/components/comic/tone-selector";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { FileUploader } from "@/components/upload/file-uploader";
import { useSession } from "@/lib/auth-client";

type Step = "upload" | "configure" | "generating";

// Helper function to determine input type from file MIME type
function getInputType(file: File | null): "text" | "pdf" | "image" | "video" {
  if (!file) return "text";

  const mimeType = file.type.toLowerCase();

  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  return "text";
}

export default function CreatePage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [uploadUrl, setUploadUrl] = useState<string>("");
  const [comicId, setComicId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("");
  const [artStyle, setArtStyle] = useState("retro");
  const [tone, setTone] = useState("friendly");
  const [outputFormat, setOutputFormat] = useState<"strip" | "separate" | "fullpage">("separate");
  const [panelCount, setPanelCount] = useState(4);
  const [error, setError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPublic, setIsPublic] = useState(false);

  useEffect(() => {
    if (!isPending && !session) {
      router.replace("/register");
    }
  }, [isPending, session, router]);

  if (isPending || !session) {
    return (
      <div className="flex justify-center items-center h-screen">
        Loading...
      </div>
    );
  }

  const handleUpload = async (uploadedFile: File) => {
    setError("");
    const formData = new FormData();
    formData.append("file", uploadedFile);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Upload failed");
      }

      const data = await response.json();
      setFile(uploadedFile);
      setUploadUrl(data.url);
      setStep("configure");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
    }
  };

  const handleGenerate = async () => {
    if (!title.trim() || !subject.trim()) {
      setError("Please enter a title and subject");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      // Create comic entry
      const createResponse = await fetch("/api/comics/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          inputType: getInputType(file),
          inputUrl: uploadUrl,
          artStyle,
          tone,
          subject: subject.trim(),
          outputFormat,
          pageSize: "letter",
          requestedPanelCount: panelCount,
          isPublic,
          tags: [subject.trim()],
          showCaptions: false,
        }),
      });

      if (!createResponse.ok) {
        const data = await createResponse.json();
        const errorMsg = data.details ? `${data.error}: ${data.details}` : data.error || "Failed to create comic";
        throw new Error(errorMsg);
      }

      const { comic } = await createResponse.json();
      setComicId(comic.id);

      // Start generation
      const generateResponse = await fetch("/api/comics/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comicId: comic.id,
          inputUrl: uploadUrl,
          inputType: getInputType(file),
          options: { subject: subject.trim(), artStyle, tone, length: "medium" },
        }),
      });

      if (!generateResponse.ok) {
        const data = await generateResponse.json();
        const errorMsg = data.details ? `${data.error}: ${data.details}` : data.error || "Failed to start generation";
        throw new Error(errorMsg);
      }

      setStep("generating");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-3xl px-4">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold">
          {step === "upload" && "Upload Your Notes"}
          {step === "configure" && "Configure Your Comic"}
          {step === "generating" && "Creating Your Comic"}
        </h1>
      </div>

      {/* Progress indicator */}
      <div className="flex items-center gap-2 mb-8">
        {["upload", "configure", "generating"].map((s, index) => (
          <div
            key={s}
            className={`flex-1 h-2 rounded-full transition-colors ${
              step === s
                ? "bg-primary"
                : ["upload", "configure", "generating"].indexOf(step) > index
                ? "bg-primary/50"
                : "bg-muted"
            }`}
          />
        ))}
      </div>

      {/* Error message */}
      {error && (
        <Card className="mb-6 border-destructive/50 bg-destructive/10">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Upload Step */}
      {step === "upload" && (
        <div className="space-y-6">
          <FileUploader onUpload={handleUpload} />
          <p className="text-sm text-muted-foreground text-center">
            Supported formats: PDF, PNG, JPG, WEBP, MP4, MOV (max 10MB)
          </p>
        </div>
      )}

      {/* Configure Step */}
      {step === "configure" && (
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6 space-y-6">
              {/* File info */}
              {file && (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium">Uploaded file:</p>
                  <p className="text-sm text-muted-foreground">{file.name}</p>
                </div>
              )}

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="My First Comic"
                  disabled={isSubmitting}
                />
              </div>

              {/* Subject */}
              <SubjectSelector value={subject} onChange={setSubject} />

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What's this comic about?"
                  rows={3}
                  disabled={isSubmitting}
                />
              </div>

              {/* Art Style */}
              <div className="space-y-3">
                <Label>Art Style</Label>
                <StyleSelector value={artStyle} onChange={setArtStyle} />
              </div>

              {/* Tone */}
              <div className="space-y-3">
                <Label>Tone</Label>
                <ToneSelector value={tone} onChange={setTone} />
              </div>

              {/* Output Format */}
              <div className="space-y-3">
                <Label>Output Format</Label>
                <OutputFormatSelector value={outputFormat} onChange={setOutputFormat} />
              </div>

              {/* Panel Count */}
              <div className="space-y-3">
                <PanelCountSelector value={panelCount} onChange={setPanelCount} />
              </div>

              {/* Public Toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Make Public</Label>
                  <p className="text-xs text-muted-foreground">
                    Allow others to see this comic in the gallery
                  </p>
                </div>
                <Switch checked={isPublic} onCheckedChange={setIsPublic} />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-4">
            <Button
              onClick={() => setStep("upload")}
              variant="outline"
              className="flex-1"
              disabled={isSubmitting}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button
              onClick={handleGenerate}
              className="flex-1"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                "Creating..."
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Comic
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Generating Step */}
      {step === "generating" && (
        <PanelLoading
          comicId={comicId}
          totalPanels={panelCount}
          onComplete={() => {
            router.push(`/comics/${comicId}`);
          }}
          onError={(errMsg) => {
            setError(errMsg);
            setStep("configure");
          }}
        />
      )}
    </div>
  );
}
