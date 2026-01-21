import { GalleryFilters } from "@/components/gallery/filters";
import { GalleryGrid } from "@/components/gallery/gallery-grid";

export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; subject?: string; sort?: string; search?: string }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const subject = params.subject ?? null;
  const sort = params.sort ?? null;
  const search = params.search ?? null;

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">Public Gallery</h1>

        <GalleryFilters />

        <GalleryGrid page={page} subject={subject} sort={sort} search={search} />
      </div>
    </div>
  );
}
