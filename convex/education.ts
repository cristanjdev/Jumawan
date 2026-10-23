import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const achievement = v.object({
  title: v.string(),
  detail: v.optional(v.string()),
  group: v.union(v.literal("Recognition"), v.literal("Leadership & activities")),
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("education")
      .withIndex("by_order")
      .collect();
  },
});

export const getById = query({
  args: { id: v.id("education") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    degree: v.string(),
    level: v.string(),
    school: v.string(),
    location: v.string(),
    period: v.string(),
    gpa: v.string(),
    status: v.string(),
    honors: v.optional(v.string()),
    description: v.string(),
    coursework: v.array(v.string()),
    achievements: v.array(achievement),
    // Photo for the education card (uploaded from the admin)
    image_url: v.optional(v.string()),
    order_index: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("education", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("education"),
    degree: v.optional(v.string()),
    level: v.optional(v.string()),
    school: v.optional(v.string()),
    location: v.optional(v.string()),
    period: v.optional(v.string()),
    gpa: v.optional(v.string()),
    status: v.optional(v.string()),
    honors: v.optional(v.string()),
    description: v.optional(v.string()),
    coursework: v.optional(v.array(v.string())),
    achievements: v.optional(v.array(achievement)),
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
  args: { id: v.id("education") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
