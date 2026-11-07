import { query, mutation } from "./_generated/server";
import { adminMutation } from "./auth";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("projects")
      .withIndex("by_order")
      .collect();
  },
});

export const listFeatured = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db
      .query("projects")
      .withIndex("by_order")
      .collect();
    return all.filter((p) => p.featured);
  },
});

export const getById = query({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = adminMutation({
  args: {
    title: v.string(),
    description: v.string(),
    // Extended fields
    category: v.optional(v.string()),
    year: v.optional(v.string()),
    about: v.optional(v.string()),
    gradient: v.optional(v.string()),
    is_active: v.optional(v.boolean()),
    // Media / links
    image_url: v.optional(v.string()),
    live_url: v.optional(v.string()),
    github_url: v.optional(v.string()),
    technologies: v.array(v.string()),
    featured: v.boolean(),
    order_index: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("projects", args);
  },
});

export const update = adminMutation({
  args: {
    id: v.id("projects"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    // Extended fields
    category: v.optional(v.string()),
    year: v.optional(v.string()),
    about: v.optional(v.string()),
    gradient: v.optional(v.string()),
    is_active: v.optional(v.boolean()),
    // Media / links
    image_url: v.optional(v.string()),
    live_url: v.optional(v.string()),
    github_url: v.optional(v.string()),
    technologies: v.optional(v.array(v.string())),
    featured: v.optional(v.boolean()),
    order_index: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    // Filter out undefined values
    const cleanUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) cleanUpdates[key] = value;
    }
    await ctx.db.patch(id, cleanUpdates);
    return await ctx.db.get(id);
  },
});

export const remove = adminMutation({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
