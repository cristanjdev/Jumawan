import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import type { MutationCtx } from "./_generated/server";

const settingType = v.union(
  v.literal("badge"),
  v.literal("resume"),
  v.literal("profile_image"),
  v.literal("hover_logo"),
  v.literal("portrait_style"),
  v.literal("depth_map")
);

/** The 3D portrait styles the hero can show; the admin picks one */
const PORTRAIT_STYLES = ["glass_card", "lanyard", "coin", "hologram", "laptop", "depth"] as const;
const portraitStyle = v.union(...PORTRAIT_STYLES.map((style) => v.literal(style)));

/** Settings that hold a single value: update it, or create it on first save */
async function upsertSingle(ctx: MutationCtx, type: "portrait_style" | "depth_map", value: string) {
  const all = await ctx.db.query("hero_settings").withIndex("by_type").collect();
  const existing = all.find((s) => s.type === type);
  if (existing) {
    await ctx.db.patch(existing._id, { value });
    return await ctx.db.get(existing._id);
  }
  const id = await ctx.db.insert("hero_settings", { type, value, order_index: 0, is_active: true });
  return await ctx.db.get(id);
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("hero_settings").collect();
  },
});

export const listActive = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("hero_settings").collect();
    return all.filter((s) => s.is_active).sort((a, b) => a.order_index - b.order_index);
  },
});

export const getByType = query({
  args: { type: settingType },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("hero_settings")
      .withIndex("by_type")
      .collect();
    return all.filter((s) => s.type === args.type && s.is_active);
  },
});

export const create = mutation({
  args: {
    type: settingType,
    value: v.string(),
    order_index: v.number(),
    is_active: v.boolean(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("hero_settings", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("hero_settings"),
    value: v.optional(v.string()),
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
  args: { id: v.id("hero_settings") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const reorder = mutation({
  args: {
    items: v.array(v.object({ id: v.id("hero_settings"), order_index: v.number() })),
  },
  handler: async (ctx, args) => {
    for (const item of args.items) {
      await ctx.db.patch(item.id, { order_index: item.order_index });
    }
  },
});

export const toggleActive = mutation({
  args: { id: v.id("hero_settings"), is_active: v.boolean() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { is_active: args.is_active });
    return await ctx.db.get(args.id);
  },
});

export const updateResume = mutation({
  args: { url: v.string() },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("hero_settings").withIndex("by_type").collect();
    const existing = all.find((s) => s.type === "resume");
    if (existing) {
      await ctx.db.patch(existing._id, { value: args.url });
      return await ctx.db.get(existing._id);
    } else {
      const id = await ctx.db.insert("hero_settings", {
        type: "resume",
        value: args.url,
        order_index: 0,
        is_active: true,
      });
      return await ctx.db.get(id);
    }
  },
});

export const updateProfileImage = mutation({
  args: { url: v.string() },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("hero_settings").withIndex("by_type").collect();
    const existing = all.find((s) => s.type === "profile_image");
    if (existing) {
      await ctx.db.patch(existing._id, { value: args.url });
      return await ctx.db.get(existing._id);
    } else {
      const id = await ctx.db.insert("hero_settings", {
        type: "profile_image",
        value: args.url,
        order_index: 0,
        is_active: true,
      });
      return await ctx.db.get(id);
    }
  },
});

export const updateHoverLogo = mutation({
  args: { url: v.string() },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("hero_settings").withIndex("by_type").collect();
    const existing = all.find((s) => s.type === "hover_logo");
    if (existing) {
      await ctx.db.patch(existing._id, { value: args.url });
      return await ctx.db.get(existing._id);
    } else {
      const id = await ctx.db.insert("hero_settings", {
        type: "hover_logo",
        value: args.url,
        order_index: 0,
        is_active: true,
      });
      return await ctx.db.get(id);
    }
  },
});

export const updatePortraitStyle = mutation({
  args: { style: portraitStyle },
  handler: async (ctx, args) => upsertSingle(ctx, "portrait_style", args.style),
});

export const updateDepthMap = mutation({
  args: { url: v.string() },
  handler: async (ctx, args) => upsertSingle(ctx, "depth_map", args.url),
});
