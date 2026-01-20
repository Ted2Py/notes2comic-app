// Use pdfreader - a pure Node.js PDF library (no worker required)
import { PdfReader } from "pdfreader";

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    const pdfReader = new PdfReader();

    return new Promise((resolve, reject) => {
      const pages: Record<number, string[]> = {};

      pdfReader.parseBuffer(buffer, (err, item) => {
        if (err) {
          // Handle error
          reject(new Error(`Failed to parse PDF: ${err}`));
          return;
        }

        if (!item) {
          // End of document - combine all pages
          const allText = Object.keys(pages)
            .sort((a, b) => parseInt(a) - parseInt(b))
            .map((pageNum) => pages[parseInt(pageNum)]?.join(" ") ?? "")
            .join("\n\n");
          resolve(allText.trim());
          return;
        }

        if (item.page) {
          // New page
          pages[item.page] = [];
        } else if (item.text) {
          // Text content - add to current page
          const currentPage = Math.max(...Object.keys(pages).map(Number));
          if (pages[currentPage]) {
            pages[currentPage].push(item.text);
          }
        }
      });
    });
  } catch (error) {
    console.error("PDF extraction error:", error);
    throw new Error("Failed to extract text from PDF");
  }
}
