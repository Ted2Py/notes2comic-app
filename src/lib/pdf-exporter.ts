// Type definitions for comic export
export interface ComicPanel {
  id: string;
  panelNumber: number;
  imageUrl: string;
  caption: string;
}

export interface ComicWithPanels {
  id: string;
  title: string;
  description: string | null;
  subject: string;
  artStyle: string;
  tone: string;
  isPublic: boolean;
  outputFormat: "strip" | "separate" | "fullpage";
  panels: ComicPanel[];
}

export interface ExportOptions {
  includeTitle?: boolean;
  watermark?: boolean;
  includeCaptions?: boolean;
  quality?: "low" | "medium" | "high";
}

interface ImageData {
  base64: string;
  mimeType: string;
  width: number;
  height: number;
}

interface PanelWithImage {
  panel: ComicPanel;
  image: ImageData;
}

/**
 * Converts a relative URL to a full URL for server-side fetching
 */
function getFullUrl(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${baseUrl}${url.startsWith("/") ? url : `/${url}`}`;
}

/**
 * Fetches an image and returns it as base64 with metadata
 */
async function fetchImage(url: string, pdf: any): Promise<ImageData> {
  const fullUrl = getFullUrl(url);
  const response = await fetch(fullUrl);
  const buffer = Buffer.from(await response.arrayBuffer());
  const mimeType = response.headers.get("content-type") || "image/png";
  const base64 = `data:${mimeType};base64,${buffer.toString("base64")}`;

  const imgProps = pdf.getImageProperties(base64);
  return {
    base64,
    mimeType,
    width: imgProps.width,
    height: imgProps.height,
  };
}

/**
 * Gets the image format string for jsPDF
 */
function getMimeTypeFromHeader(mimeType: string): string {
  if (mimeType === "image/webp") {
    return "PNG";
  }
  const ext = mimeType.split("/")[1]?.toUpperCase();
  if (ext && ["JPEG", "PNG", "JPG", "GIF"].includes(ext)) {
    return ext === "JPG" ? "JPEG" : ext;
  }
  return "PNG";
}

/**
 * Add wrapped caption text below an image
 */
function addCaption(pdf: any, text: string, x: number, y: number, maxWidth: number): number {
  pdf.setFontSize(9);
  const lines = pdf.splitTextToSize(text, maxWidth);
  const lineHeight = 4.5;

  lines.forEach((line: string, index: number) => {
    pdf.text(line, x + maxWidth / 2, y + index * lineHeight, { align: "center" });
  });

  return lines.length * lineHeight;
}

export async function exportComicToPDF(
  comic: ComicWithPanels,
  options: ExportOptions = {}
): Promise<Blob> {
  const jsPDF = (await import("jspdf")).default;
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const availableWidth = pageWidth - 2 * margin;

  // Export based on output format
  switch (comic.outputFormat) {
    case "fullpage":
      await exportFullPage(pdf, comic, options, pageWidth, pageHeight, margin, availableWidth);
      break;
    case "strip":
      await exportStrip(pdf, comic, options, pageWidth, pageHeight, margin, availableWidth);
      break;
    case "separate":
    default:
      await exportSeparate(pdf, comic, options, pageWidth, pageHeight, margin, availableWidth);
      break;
  }

  return pdf.output("blob");
}

/**
 * Export as full page - all panels in a grid on one page
 */
async function exportFullPage(
  pdf: any,
  comic: ComicWithPanels,
  options: ExportOptions,
  pageWidth: number,
  pageHeight: number,
  margin: number,
  availableWidth: number
) {
  const panelCount = comic.panels.length;

  // Calculate grid dimensions
  const cols = Math.ceil(Math.sqrt(panelCount));
  const rows = Math.ceil(panelCount / cols);

  const padding = 4;
  const panelWidth = (availableWidth - (cols - 1) * padding) / cols;
  const maxPanelHeight = (pageHeight - 2 * margin - (rows - 1) * padding) / rows;

  // Fetch all images
  const images: PanelWithImage[] = [];
  for (const panel of comic.panels) {
    const image = await fetchImage(panel.imageUrl, pdf);
    images.push({ panel, image });
  }

  // Add images in grid
  for (let i = 0; i < images.length; i++) {
    const item = images[i];
    if (!item) continue;

    const { panel, image } = item;
    const row = Math.floor(i / cols);
    const col = i % cols;

    const x = margin + col * (panelWidth + padding);
    let y = margin + row * (maxPanelHeight + padding);

    // Scale image to fit panel
    const scale = Math.min(panelWidth / image.width, maxPanelHeight / image.height);
    const imgWidth = image.width * scale;
    const imgHeight = image.height * scale;

    // Center in grid cell
    y += (maxPanelHeight - imgHeight) / 2;

    pdf.addImage(
      image.base64,
      getMimeTypeFromHeader(image.mimeType),
      x,
      y,
      imgWidth,
      imgHeight
    );

    // Add caption below panel (outside the panel area)
    if (options.includeCaptions && panel.caption) {
      const captionY = y + imgHeight + 3;
      addCaption(pdf, panel.caption, x, captionY, panelWidth);
    }
  }

  // Add watermark if requested
  addWatermark(pdf, options, pageWidth, pageHeight);
}

/**
 * Export as strip - panels in a horizontal strip on one page
 */
async function exportStrip(
  pdf: any,
  comic: ComicWithPanels,
  options: ExportOptions,
  pageWidth: number,
  pageHeight: number,
  margin: number,
  availableWidth: number
) {
  const panelCount = comic.panels.length;
  const padding = 5;
  const panelWidth = (availableWidth - (panelCount - 1) * padding) / panelCount;

  // Fetch all images
  const images: PanelWithImage[] = [];
  for (const panel of comic.panels) {
    const image = await fetchImage(panel.imageUrl, pdf);
    images.push({ panel, image });
  }

  // Calculate max height for panels
  let maxHeight = 0;
  for (const { image } of images) {
    const scale = panelWidth / image.width;
    const imgHeight = image.height * scale;
    maxHeight = Math.max(maxHeight, imgHeight);
  }

  // Center vertically on page
  const startY = margin + (pageHeight - 2 * margin - maxHeight) / 2;
  let currentX = margin;

  // Add images in strip
  for (const { panel, image } of images) {
    const scale = panelWidth / image.width;
    const imgWidth = image.width * scale;
    const imgHeight = image.height * scale;
    const y = startY + (maxHeight - imgHeight) / 2;

    pdf.addImage(
      image.base64,
      getMimeTypeFromHeader(image.mimeType),
      currentX,
      y,
      imgWidth,
      imgHeight
    );

    // Add caption below panel
    if (options.includeCaptions && panel.caption) {
      const captionY = y + imgHeight + 4;
      addCaption(pdf, panel.caption, currentX, captionY, panelWidth);
    }

    currentX += panelWidth + padding;
  }

  // Add watermark if requested
  addWatermark(pdf, options, pageWidth, pageHeight);
}

/**
 * Export as separate - each panel on its own page
 */
async function exportSeparate(
  pdf: any,
  comic: ComicWithPanels,
  options: ExportOptions,
  pageWidth: number,
  pageHeight: number,
  margin: number,
  availableWidth: number
) {
  for (let i = 0; i < comic.panels.length; i++) {
    const panel = comic.panels[i];
    if (!panel) continue;

    const image = await fetchImage(panel.imageUrl, pdf);

    // Scale image to fit page (without reserving caption space)
    const scale = Math.min(availableWidth / image.width, (pageHeight - 2 * margin) / image.height);
    const imgWidth = image.width * scale;
    const imgHeight = image.height * scale;

    // Center on page
    const x = margin + (availableWidth - imgWidth) / 2;
    const y = margin + ((pageHeight - 2 * margin) - imgHeight) / 2;

    pdf.addImage(
      image.base64,
      getMimeTypeFromHeader(image.mimeType),
      x,
      y,
      imgWidth,
      imgHeight
    );

    // Add caption below panel
    if (options.includeCaptions && panel.caption) {
      const captionY = y + imgHeight + 6;
      addCaption(pdf, panel.caption, x, captionY, imgWidth);
    }

    // Add watermark if requested
    addWatermark(pdf, options, pageWidth, pageHeight);

    // Add new page if not the last panel
    if (i < comic.panels.length - 1) {
      pdf.addPage();
    }
  }
}

/**
 * Add watermark to the current page
 */
function addWatermark(pdf: any, options: ExportOptions, pageWidth: number, pageHeight: number) {
  if (options.watermark) {
    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    pdf.text(
      "Generated by Notes2Comic",
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );
    pdf.setTextColor(0, 0, 0); // Reset color
  }
}
