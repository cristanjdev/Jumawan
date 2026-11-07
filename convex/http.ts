import { httpRouter } from "convex/server";
import { httpAction, type ActionCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

const http = httpRouter();

/** Required on every response so cross-origin fetch() does not fail CORS on 4xx/5xx. */
const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  // Serve files as the type they were stored with; never let the browser guess
  "X-Content-Type-Options": "nosniff",
};

/** Looks up a stored file; a malformed id is treated as "not found" instead of a server error. */
async function getStored(ctx: ActionCtx, storageId: string) {
  try {
    return await ctx.storage.get(storageId as Id<"_storage">);
  } catch {
    return null;
  }
}

http.route({
  path: "/getImage",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const storageId = url.searchParams.get("storageId");

    if (!storageId) {
      return new Response("Missing storageId", { status: 400, headers: CORS });
    }

    const blob = await getStored(ctx, storageId);
    if (!blob) {
      return new Response("Image not found", { status: 404, headers: CORS });
    }

    return new Response(blob, {
      headers: {
        "Cache-Control": "public, max-age=31536000",
        ...CORS,
      },
    });
  }),
});

// Download a stored file (the resume) with a friendly file name.
// (There used to be a /downloadFile?url= route that fetched any URL for anyone. It was unused and an
// open proxy, so it was removed.)
http.route({
  path: "/downloadByStorageId",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const storageId = url.searchParams.get("storageId");
    // Keep the name to safe characters (it goes into a header) and drop any extension it already has
    const filename =
      (url.searchParams.get("filename") || "Jumawan-Resume")
        .replace(/\.[a-z0-9]{1,5}$/i, "")
        .replace(/[^\w.-]+/g, "-")
        .slice(0, 100) || "Jumawan-Resume";

    if (!storageId) {
      return new Response("Missing storageId", { status: 400, headers: CORS });
    }

    const blob = await getStored(ctx, storageId);
    if (!blob) {
      return new Response("File not found", { status: 404, headers: CORS });
    }

    const contentType = blob.type || "application/octet-stream";
    const mimeToExt: Record<string, string> = {
      "application/pdf": "pdf",
      "image/jpeg": "jpg",
      "image/jpg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
      "application/msword": "doc",
    };
    const ext = mimeToExt[contentType.split(";")[0].trim()] || "pdf";
    const finalFilename = `${filename}.${ext}`;

    return new Response(blob, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${finalFilename}"`,
        "Cache-Control": "no-cache",
        ...CORS,
      },
    });
  }),
});

export default http;
