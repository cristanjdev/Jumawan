import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("skill_categories")
      .withIndex("by_order")
      .collect();
  },
});

export const listActive = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db
      .query("skill_categories")
      .withIndex("by_order")
      .collect();
    return all.filter((c) => c.is_active);
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    icon_slug: v.string(),
    color_slug: v.string(),
    skills: v.array(v.string()),
    description: v.optional(v.string()),
    examples: v.optional(v.array(v.string())),
    order_index: v.optional(v.number()),
    is_active: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("skill_categories", {
      title: args.title,
      icon_slug: args.icon_slug,
      color_slug: args.color_slug,
      skills: args.skills,
      description: args.description,
      examples: args.examples,
      order_index: args.order_index ?? 0,
      is_active: args.is_active ?? true,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("skill_categories"),
    title: v.optional(v.string()),
    icon_slug: v.optional(v.string()),
    color_slug: v.optional(v.string()),
    skills: v.optional(v.array(v.string())),
    description: v.optional(v.string()),
    examples: v.optional(v.array(v.string())),
    order_index: v.optional(v.number()),
    is_active: v.optional(v.boolean()),
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
  args: { id: v.id("skill_categories") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const reorder = mutation({
  args: {
    items: v.array(
      v.object({ id: v.id("skill_categories"), order_index: v.number() })
    ),
  },
  handler: async (ctx, args) => {
    for (const item of args.items) {
      await ctx.db.patch(item.id, { order_index: item.order_index });
    }
  },
});

export const toggleActive = mutation({
  args: { id: v.id("skill_categories"), is_active: v.boolean() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { is_active: args.is_active });
    return await ctx.db.get(args.id);
  },
});
