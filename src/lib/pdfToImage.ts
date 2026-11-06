/**
 * Draws every page of a PDF into one PNG (pages stacked top to bottom).
 *
 * The resume used to be shown in an <iframe>, which depends on the browser's own PDF viewer:
 * Chromium browsers (Chrome, Edge, Opera) refuse it inside a sandboxed frame and show
 * ERR_BLOCKED_BY_CLIENT, and most phone browsers can't show a PDF in a frame at all.
 * Rendering it ourselves gives the same picture everywhere, and the modal's zoom / drag works on it.
 *
 * pdf.js is loaded on demand, so it only downloads when someone opens the resume.
 */

/** Output width in pixels: sharp enough to zoom into, small enough for phones. */
const TARGET_WIDTH = 1800;
/** Gap between pages, in output pixels. */
const PAGE_GAP = 24;
/** Browsers cap canvas size; stay well under the smallest limit (iOS Safari). */
const MAX_CANVAS_PIXELS = 16_000_000;

export async function renderPdfToImage(data: ArrayBuffer): Promise<Blob> {
  const [pdfjs, { default: workerUrl }] = await Promise.all([
    import("pdfjs-dist/legacy/build/pdf.mjs"),
    import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url"),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const task = pdfjs.getDocument({ data: new Uint8Array(data) });
  const doc = await task.promise;
  try {
    const pages = await Promise.all(
      Array.from({ length: doc.numPages }, (_, i) => doc.getPage(i + 1))
    );

    // Scale every page to the same width, shrinking further if the stack would be too big for a canvas
    const base = pages.map((page) => page.getViewport({ scale: 1 }));
    const widest = Math.max(...base.map((v) => v.width));
    let scale = TARGET_WIDTH / widest;
    const heightAt = (s: number) =>
      base.reduce((sum, v) => sum + Math.ceil(v.height * s), 0) + PAGE_GAP * (pages.length - 1);
    const pixels = Math.ceil(widest * scale) * heightAt(scale);
    if (pixels > MAX_CANVAS_PIXELS) scale *= Math.sqrt(MAX_CANVAS_PIXELS / pixels);

    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(widest * scale);
    canvas.height = heightAt(scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not available");

    let top = 0;
    for (const page of pages) {
      const viewport = page.getViewport({ scale });
      const pageCanvas = document.createElement("canvas");
      pageCanvas.width = Math.ceil(viewport.width);
      pageCanvas.height = Math.ceil(viewport.height);
      await page.render({ canvas: pageCanvas, viewport, background: "#ffffff" }).promise;
      ctx.drawImage(pageCanvas, Math.floor((canvas.width - pageCanvas.width) / 2), top);
      top += pageCanvas.height + PAGE_GAP;
    }

    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not encode the page"))), "image/png")
    );
  } finally {
    void task.destroy();
  }
}
