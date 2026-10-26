import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("certificates")
      .withIndex("by_order")
      .collect();
  },
});

export const getById = query({
  args: { id: v.id("certificates") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    issuer: v.string(),
    issue_date: v.string(),
    credential_id: v.optional(v.string()),
    credential_url: v.optional(v.string()),
    verification_image_url: v.optional(v.string()),
    image_url: v.optional(v.string()),
    thumbnail_url: v.optional(v.string()),
    description: v.optional(v.string()),
    order_index: v.number(),
    type: v.optional(v.union(v.literal("participation"), v.literal("recognition"))),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("certificates", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("certificates"),
    title: v.optional(v.string()),
    issuer: v.optional(v.string()),
    issue_date: v.optional(v.string()),
    credential_id: v.optional(v.string()),
    credential_url: v.optional(v.string()),
    verification_image_url: v.optional(v.string()),
    image_url: v.optional(v.string()),
    thumbnail_url: v.optional(v.string()),
    description: v.optional(v.string()),
    order_index: v.optional(v.number()),
    type: v.optional(v.union(v.literal("participation"), v.literal("recognition"))),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const cleanUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) cleanUpdates[key] = value;
    }
    await ctx.db.patch(id, cleanUpdates);
    return await ctx.db.get(id);
  },
});

export const remove = mutation({
  args: { id: v.id("certificates") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
