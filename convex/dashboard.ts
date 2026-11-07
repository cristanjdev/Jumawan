import { query, mutation } from "./_generated/server";
import { adminQuery } from "./auth";
import { v } from "convex/values";

export const getStats = adminQuery({
  args: {},
  handler: async (ctx) => {
    const projects = await ctx.db.query("projects").collect();
    const certificates = await ctx.db.query("certificates").collect();
    const messages = await ctx.db.query("contact_messages").collect();
    const unread = messages.filter((m) => m.status === "unread");

    const recentMessages = messages
      .sort((a, b) => b._creationTime - a._creationTime)
      .slice(0, 3);

    const recentProjects = projects
      .sort((a, b) => b._creationTime - a._creationTime)
      .slice(0, 3);

    return {
      totalProjects: projects.length,
      totalCertificates: certificates.length,
      totalMessages: messages.length,
      unreadMessages: unread.length,
      recentMessages,
      recentProjects,
    };
  },
});

const SESSION_MS = 24 * 60 * 60 * 1000;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 5;

/** Compares two strings in time that doesn't depend on where they first differ. */
function safeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

/** 256 bits from the platform's secure random generator, as hex. */
function newToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

// Auth: session-based sign-in for the admin. Credentials live in the Convex environment
// (ADMIN_EMAIL / ADMIN_PASSWORD); after 5 wrong tries in 15 minutes sign-in is paused.
export const login = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const recentFailures = await ctx.db
      .query("admin_login_attempts")
      .withIndex("by_time", (q) => q.gt("at", now - LOCKOUT_WINDOW_MS))
      .collect();
    if (recentFailures.length >= MAX_FAILED_ATTEMPTS) {
      return { success: false, error: "Too many attempts. Please try again in 15 minutes." };
    }

    const adminEmail = process.env.ADMIN_EMAIL || "cristanjade14@gmail.com";
    const adminPassword = process.env.ADMIN_PASSWORD || "";
    const emailOk = safeEqual(args.email.trim().toLowerCase(), adminEmail.toLowerCase());
    const passwordOk = adminPassword !== "" && safeEqual(args.password, adminPassword);

    if (!emailOk || !passwordOk) {
      await ctx.db.insert("admin_login_attempts", { at: now });
      return { success: false, error: "Invalid credentials" };
    }

    // Signed in: clear old failures and expired sessions
    for (const attempt of await ctx.db.query("admin_login_attempts").collect()) {
      await ctx.db.delete(attempt._id);
    }
    for (const old of await ctx.db.query("admin_sessions").collect()) {
      if (old.expires_at < now) await ctx.db.delete(old._id);
    }

    const token = newToken();
    await ctx.db.insert("admin_sessions", {
      email: adminEmail,
      token,
      expires_at: now + SESSION_MS,
    });

    return { success: true, token, email: adminEmail };
  },
});

export const validateSession = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query("admin_sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .collect();

    const session = sessions[0];
    if (!session || session.expires_at < Date.now()) {
      return { valid: false };
    }

    return { valid: true, email: session.email };
  },
});

export const logout = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query("admin_sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .collect();

    for (const session of sessions) {
      await ctx.db.delete(session._id);
    }
  },
});
