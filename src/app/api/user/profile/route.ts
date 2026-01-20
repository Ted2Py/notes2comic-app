import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user } from "@/lib/schema";
import { upload, deleteFile } from "@/lib/storage";

// GET - Get current user profile
export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profileUser = await db.query.user.findFirst({
      where: eq(user.id, session.user.id),
    });

    if (!profileUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: profileUser.id,
      name: profileUser.name,
      email: profileUser.email,
      image: profileUser.image,
      bio: profileUser.bio,
    });
  } catch (error) {
    console.error("Get profile error:", error);
    return NextResponse.json(
      { error: "Failed to get profile" },
      { status: 500 }
    );
  }
}

// PATCH - Update user profile (name, bio, image)
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const name = formData.get("name") as string | null;
    const bio = formData.get("bio") as string | null;
    const imageFile = formData.get("image") as File | null;

    console.log("Profile update request:", { name, bio, hasImage: !!imageFile });

    // Build update object
    const updates: {
      name?: string;
      bio?: string | null;
      image?: string | null;
    } = {};

    if (name !== null && name !== undefined) {
      updates.name = name;
    }

    if (bio !== null && bio !== undefined) {
      updates.bio = bio === "" ? null : bio;
    }

    // Handle image upload
    if (imageFile && imageFile.size > 0) {
      console.log("Processing image upload:", imageFile.name, imageFile.size);
      const arrayBuffer = await imageFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Delete old image if exists
      const currentUser = await db.query.user.findFirst({
        where: eq(user.id, session.user.id),
      });

      if (currentUser?.image) {
        try {
          await deleteFile(currentUser.image);
          console.log("Deleted old image:", currentUser.image);
        } catch (deleteError) {
          console.warn("Failed to delete old image:", deleteError);
        }
      }

      // Upload new image
      const result = await upload(buffer, imageFile.name, "avatars");
      updates.image = result.url;
      console.log("Uploaded new image:", result.url);
    }

    console.log("Updating user with:", updates);

    // Update user
    await db
      .update(user)
      .set(updates)
      .where(eq(user.id, session.user.id));

    console.log("User updated successfully");

    // Fetch updated user
    const updatedUser = await db.query.user.findFirst({
      where: eq(user.id, session.user.id),
    });

    return NextResponse.json({
      id: updatedUser?.id,
      name: updatedUser?.name,
      email: updatedUser?.email,
      image: updatedUser?.image,
      bio: updatedUser?.bio,
    });
  } catch (error) {
    console.error("Update profile error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error details:", errorMessage);
    return NextResponse.json(
      { error: errorMessage || "Failed to update profile" },
      { status: 500 }
    );
  }
}
