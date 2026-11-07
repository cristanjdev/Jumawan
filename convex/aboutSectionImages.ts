import { query, mutation } from "./_generated/server";
import { adminMutation } from "./auth";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("about_section_images")
      .withIndex("by_order")
      .collect();
  },
});

export const listActive = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db
      .query("about_section_images")
      .withIndex("by_order")
      .collect();
    return all.filter((img) => img.is_active);
  },
});

export const create = adminMutation({
  args: {
    image_url: v.string(),
    label: v.string(),
    order_index: v.optional(v.number()),
    is_active: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("about_section_images", {
      image_url: args.image_url,
      label: args.label,
      order_index: args.order_index ?? 0,
      is_active: args.is_active ?? true,
    });
  },
});

export const update = adminMutation({
  args: {
    id: v.id("about_section_images"),
    image_url: v.optional(v.string()),
    label: v.optional(v.string()),
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

export const remove = adminMutation({
  args: { id: v.id("about_section_images") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const reorder = adminMutation({
  args: {
    items: v.array(
      v.object({ id: v.id("about_section_images"), order_index: v.number() })
    ),
  },
  handler: async (ctx, args) => {
    for (const item of args.items) {
      await ctx.db.patch(item.id, { order_index: item.order_index });
    }
  },
});

export const toggleActive = adminMutation({
  args: { id: v.id("about_section_images"), is_active: v.boolean() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { is_active: args.is_active });
    return await ctx.db.get(args.id);
  },
});
