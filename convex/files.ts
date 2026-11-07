import { adminMutation } from "./auth";

/** Short-lived URL for uploading a file to storage. Admin only, so nobody else can use the storage. */
export const generateUploadUrl = adminMutation({
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});
