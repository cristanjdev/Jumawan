import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("work_experience")
      .withIndex("by_order")
      .collect();
  },
});

export const getById = query({
  args: { id: v.id("work_experience") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    company: v.string(),
    position: v.string(),
    type: v.union(
      v.literal("Full-time"),
      v.literal("Part-time"),
      v.literal("Freelance"),
      v.literal("Internship"),
      v.literal("Contract")
    ),
    location: v.string(),
    start_date: v.string(),
    end_date: v.optional(v.string()),
    current: v.boolean(),
    duration: v.optional(v.string()),
    achievements: v.array(v.string()),
    responsibilities: v.array(v.string()),
    technologies: v.array(v.string()),
    team_size: v.optional(v.string()),
    company_size: v.optional(v.string()),
    // Photo for the experience card (uploaded from the admin)
    image_url: v.optional(v.string()),
    order_index: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("work_experience", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("work_experience"),
    company: v.optional(v.string()),
    position: v.optional(v.string()),
    type: v.optional(
      v.union(
        v.literal("Full-time"),
        v.literal("Part-time"),
        v.literal("Freelance"),
        v.literal("Internship"),
        v.literal("Contract")
      )
    ),
    location: v.optional(v.string()),
    start_date: v.optional(v.string()),
    end_date: v.optional(v.string()),
    current: v.optional(v.boolean()),
    duration: v.optional(v.string()),
    achievements: v.optional(v.array(v.string())),
    responsibilities: v.optional(v.array(v.string())),
    technologies: v.optional(v.array(v.string())),
    team_size: v.optional(v.string()),
    company_size: v.optional(v.string()),
    // Photo for the experience card (uploaded from the admin)
    image_url: v.optional(v.string()),
    order_index: v.optional(v.number()),
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
  args: { id: v.id("work_experience") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
