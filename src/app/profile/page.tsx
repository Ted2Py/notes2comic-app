"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Mail,
  Calendar,
  User,
  ArrowLeft,
  Sparkles,
  Palette,
  BarChart3,
  Camera,
  Loader2,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { StyleSelector } from "@/components/comic/style-selector";
import { ToneSelector } from "@/components/comic/tone-selector";
import { ImageCropDialog } from "@/components/profile/image-crop-dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useSession, getSession } from "@/lib/auth-client";

interface UsageStats {
  totalComics: number;
  totalPanels: number;
  completedComics: number;
  draftComics: number;
}

export default function ProfilePage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [comicsSettingsOpen, setComicsSettingsOpen] = useState(false);
  const [usageStats, setUsageStats] = useState<UsageStats>({
    totalComics: 0,
    totalPanels: 0,
    completedComics: 0,
    draftComics: 0,
  });
  const [preferredArtStyle, setPreferredArtStyle] = useState("retro");
  const [preferredTone, setPreferredTone] = useState("friendly");
  const [googleCredentials, setGoogleCredentials] = useState({
    projectId: "",
    apiKey: "",
  });

  // Profile editing state
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editImage, setEditImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  // Inline bio editing state
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [inlineBio, setInlineBio] = useState("");
  const [isSavingBio, setIsSavingBio] = useState(false);

  // Image crop dialog state
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [originalImageSrc, setOriginalImageSrc] = useState<string>("");
  const [croppedImageBlob, setCroppedImageBlob] = useState<Blob | null>(null);

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/");
    }
  }, [isPending, session, router]);

  useEffect(() => {
    // Fetch user's comics stats
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/comics");
        if (response.ok) {
          const data = await response.json();
          const comics = data.comics || [];
          const completed = comics.filter((c: any) => c.status === "completed");
          const drafts = comics.filter((c: any) => c.status === "draft");
          const totalPanels = comics.reduce(
            (sum: number, c: any) => sum + (c.metadata?.panelCount || c.panels?.length || 0),
            0
          );

          setUsageStats({
            totalComics: comics.length,
            totalPanels,
            completedComics: completed.length,
            draftComics: drafts.length,
          });
        }
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      }
    };

    fetchStats();
  }, []);

  if (isPending || !session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Loading...</div>
      </div>
    );
  }

  const user = session.user;
  const createdDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  const handleEditProfileSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const formData = new FormData();
      formData.append("name", editName);
      formData.append("bio", editBio);

      // Use cropped image if available, otherwise use original file
      const imageToUpload = croppedImageBlob || editImage;
      if (imageToUpload) {
        const file = croppedImageBlob
          ? new File([croppedImageBlob], "profile-cropped.jpg", { type: "image/jpeg" })
          : editImage!;
        formData.append("image", file);
      }

      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update profile");
      }

      // Refresh session data
      await getSession();

      toast.success("Profile updated successfully!");
      setEditProfileOpen(false);
      setEditImage(null);
      setImagePreview("");
      setCroppedImageBlob(null);
    } catch (error) {
      console.error("Failed to update profile:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setOriginalImageSrc(reader.result as string);
        setCropDialogOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    setIsSaving(true);
    try {
      const formData = new FormData();
      const file = new File([croppedBlob], "profile-cropped.jpg", { type: "image/jpeg" });
      formData.append("image", file);

      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update profile image");
      }

      // Update local user data immediately
      const reader = new FileReader();
      reader.onloadend = () => {
        if (session?.user) {
          (session.user as any).image = reader.result;
        }
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(croppedBlob);

      await getSession();
      toast.success("Profile image updated!", {
        duration: 2000,
      });
    } catch (error) {
      console.error("Failed to update profile image:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update profile image", {
        duration: 2000,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const openEditProfile = () => {
    setEditName(user.name || "");
    setEditBio((user as any).bio || "");
    setImagePreview(user.image || "");
    setEditImage(null);
    setEditProfileOpen(true);
  };

  const handleInlineBioSave = async () => {
    setIsSavingBio(true);
    try {
      const formData = new FormData();
      formData.append("bio", inlineBio);

      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update bio");
      }

      // Update local user data immediately
      if (session?.user) {
        (session.user as any).bio = inlineBio;
      }

      await getSession();
      setIsEditingBio(false);
      toast.success("Bio updated successfully!", {
        duration: 2000,
      });
    } catch (error) {
      console.error("Failed to update bio:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update bio", {
        duration: 2000,
      });
    } finally {
      setIsSavingBio(false);
    }
  };

  const startInlineBioEdit = () => {
    setInlineBio((user as any).bio || "");
    setIsEditingBio(true);
  };

  const handleProfileImageClick = () => {
    // Trigger the image input click
    const input = document.getElementById("profile-image-upload") as HTMLInputElement;
    input?.click();
  };

  const cancelInlineBioEdit = () => {
    setIsEditingBio(false);
    setInlineBio("");
  };

  const handleSaveComicSettings = () => {
    toast.success("Comic preferences saved!");
    setComicsSettingsOpen(false);
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">Your Profile</h1>
      </div>

      <div className="grid gap-6">
        {/* Profile Overview Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-4">
              <div className="group relative">
                <Avatar
                  className="h-20 w-20 cursor-pointer"
                  onClick={handleProfileImageClick}
                >
                  <AvatarImage
                    src={user.image || ""}
                    alt={user.name || "User"}
                    referrerPolicy="no-referrer"
                  />
                  <AvatarFallback className="text-lg">
                    {(user.name?.[0] || user.email?.[0] || "U").toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer" onClick={handleProfileImageClick}>
                  <Camera className="h-6 w-6 text-white" />
                </div>
                <input
                  id="profile-image-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold">{user.name}</h2>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>{user.email}</span>
                </div>
                {createdDate && (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Calendar className="h-4 w-4" />
                    <span>Member since {createdDate}</span>
                  </div>
                )}
                {/* Inline Bio Editor */}
                <div className="mt-3">
                  {isEditingBio ? (
                    <div className="space-y-2">
                      <Textarea
                        value={inlineBio}
                        onChange={(e) => setInlineBio(e.target.value)}
                        placeholder="Tell others about yourself..."
                        rows={2}
                        maxLength={500}
                        className="resize-none"
                        autoFocus
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {inlineBio.length}/500
                        </span>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={cancelInlineBioEdit}
                            disabled={isSavingBio}
                          >
                            <X className="h-3 w-3 mr-1" />
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleInlineBioSave}
                            disabled={isSavingBio}
                          >
                            {isSavingBio ? (
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            ) : (
                              <Check className="h-3 w-3 mr-1" />
                            )}
                            Save
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="group relative">
                      <p className="text-sm text-muted-foreground pr-6">
                        {(user as any).bio || (
                          <span className="italic text-muted-foreground/60">No bio yet</span>
                        )}
                      </p>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="absolute top-0 right-0 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={startInlineBioEdit}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Notes2Comic Usage Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Your Comic Statistics
            </CardTitle>
            <CardDescription>Track your creative progress</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 border rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">{usageStats.totalComics}</p>
                <p className="text-sm text-muted-foreground">Total Comics</p>
              </div>
              <div className="p-4 border rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">{usageStats.totalPanels}</p>
                <p className="text-sm text-muted-foreground">Total Panels</p>
              </div>
              <div className="p-4 border rounded-lg bg-green-500/10">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {usageStats.completedComics}
                </p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
              <div className="p-4 border rounded-lg bg-yellow-500/10">
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {usageStats.draftComics}
                </p>
                <p className="text-sm text-muted-foreground">Drafts</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Comic Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Comic Preferences
            </CardTitle>
            <CardDescription>
              Set your default style and tone for new comics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Default Style</p>
                  <p className="font-medium capitalize">{preferredArtStyle}</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Default Tone</p>
                  <p className="font-medium capitalize">{preferredTone}</p>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setComicsSettingsOpen(true)}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Edit Comic Preferences
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>Your account details and settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Full Name
                </label>
                <div className="p-3 border rounded-md bg-muted/10">
                  {user.name || "Not provided"}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Email Address
                </label>
                <div className="p-3 border rounded-md bg-muted/10">
                  <span>{user.email}</span>
                </div>
              </div>
            </div>

            <Separator />
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Manage your account settings and preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full justify-start h-auto p-4"
              onClick={openEditProfile}
            >
              <User className="h-4 w-4 mr-2" />
              <div className="text-left">
                <div className="font-medium">Edit Profile</div>
                <div className="text-xs text-muted-foreground">
                  Update your information
                </div>
              </div>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={editProfileOpen} onOpenChange={setEditProfileOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Update your profile information. Changes will be saved to your account.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditProfileSubmit} className="space-y-4">
            {/* Profile Image Upload */}
            <div className="space-y-2">
              <Label>Profile Image</Label>
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={imagePreview || undefined} />
                  <AvatarFallback>
                    {editName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <Label
                    htmlFor="image-upload"
                    className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 text-sm border rounded-md hover:bg-muted"
                  >
                    <Camera className="h-4 w-4" />
                    {editImage ? "Change Image" : "Upload Image"}
                  </Label>
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    JPG, PNG or GIF. Max 5MB.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Enter your name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                placeholder="Tell others about yourself..."
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground text-right">
                {editBio.length}/500
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                defaultValue={user.email || ""}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditProfileOpen(false);
                  setEditImage(null);
                  setImagePreview("");
                }}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Comic Settings Dialog */}
      <Dialog open={comicsSettingsOpen} onOpenChange={setComicsSettingsOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Comic Preferences</DialogTitle>
            <DialogDescription>
              Set your defaults and configure Google Cloud credentials
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {/* Default Style & Tone */}
            <div className="space-y-4">
              <h3 className="font-medium">Default Style & Tone</h3>
              <div className="space-y-2">
                <Label>Preferred Art Style</Label>
                <StyleSelector
                  value={preferredArtStyle}
                  onChange={setPreferredArtStyle}
                />
              </div>
              <div className="space-y-2">
                <Label>Preferred Tone</Label>
                <ToneSelector value={preferredTone} onChange={setPreferredTone} />
              </div>
            </div>

            <Separator />

            {/* Google Cloud Credentials (Optional) */}
            <div className="space-y-4">
              <h3 className="font-medium">Google Cloud Credentials (Optional)</h3>
              <p className="text-sm text-muted-foreground">
                Provide your own Google Cloud credentials for AI generation. If
                not provided, the app's default credentials will be used.
              </p>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="projectId">Project ID</Label>
                  <Input
                    id="projectId"
                    value={googleCredentials.projectId}
                    onChange={(e) =>
                      setGoogleCredentials({ ...googleCredentials, projectId: e.target.value })
                    }
                    placeholder="your-project-id"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apiKey">API Key</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    value={googleCredentials.apiKey}
                    onChange={(e) =>
                      setGoogleCredentials({ ...googleCredentials, apiKey: e.target.value })
                    }
                    placeholder="your-api-key"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setComicsSettingsOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveComicSettings}>Save Changes</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Crop Dialog */}
      <ImageCropDialog
        open={cropDialogOpen}
        onClose={() => setCropDialogOpen(false)}
        imageSrc={originalImageSrc}
        onCropComplete={handleCropComplete}
      />
    </div>
  );
}
