import { query, mutation } from "./_generated/server";
import { adminMutation, adminQuery } from "./auth";
import { ConvexError, v } from "convex/values";

export const list = adminQuery({
  args: { statusFilter: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.statusFilter && args.statusFilter !== "all") {
      const all = await ctx.db
        .query("contact_messages")
        .withIndex("by_status")
        .collect();
      return all.filter((m) => m.status === args.statusFilter);
    }
    return await ctx.db.query("contact_messages").order("desc").collect();
  },
});

export const getById = adminQuery({
  args: { id: v.id("contact_messages") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Public: the contact form. Inputs are checked and size-limited, and new messages are always "unread".
export const create = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    subject: v.optional(v.string()),
    message: v.string(),
    // Accepted for older clients, but ignored: a new message is always unread
    status: v.optional(
      v.union(v.literal("unread"), v.literal("read"), v.literal("replied"), v.literal("archived"))
    ),
  },
  handler: async (ctx, args) => {
    const name = args.name.trim();
    const email = args.email.trim();
    const subject = args.subject?.trim() || undefined;
    const message = args.message.trim();

    if (!name || name.length > 100) throw new ConvexError("Please enter your name (up to 100 characters).");
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new ConvexError("Please enter a valid email address.");
    }
    if (subject && subject.length > 200) throw new ConvexError("The subject is too long (up to 200 characters).");
    if (!message || message.length > 5000) {
      throw new ConvexError("Please enter a message (up to 5,000 characters).");
    }

    return await ctx.db.insert("contact_messages", { name, email, subject, message, status: "unread" });
  },
});

export const updateStatus = adminMutation({
  args: {
    id: v.id("contact_messages"),
    status: v.union(
      v.literal("unread"),
      v.literal("read"),
      v.literal("replied"),
      v.literal("archived")
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: args.status });
    return await ctx.db.get(args.id);
  },
});

export const remove = adminMutation({
  args: { id: v.id("contact_messages") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
