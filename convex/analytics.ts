import { query, mutation } from "./_generated/server";
import { adminQuery } from "./auth";
import { v } from "convex/values";

export const list = adminQuery({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const q = ctx.db.query("analytics").order("desc");
    if (args.limit) {
      return await q.take(args.limit);
    }
    return await q.collect();
  },
});

export const getByDateRange = adminQuery({
  args: { days: v.number() },
  handler: async (ctx, args) => {
    const endDate = Date.now();
    const startDate = endDate - args.days * 24 * 60 * 60 * 1000;

    const all = await ctx.db.query("analytics").order("desc").collect();
    const views = all.filter(
      (a) =>
        a._creationTime >= startDate &&
        a._creationTime <= endDate &&
        a.event_type === "page_view"
    );

    // Process page views
    const pageViewsMap = new Map<string, number>();
    views.forEach((item) => {
      const page = item.page_url || "Unknown";
      pageViewsMap.set(page, (pageViewsMap.get(page) || 0) + 1);
    });

    const pageViews = Array.from(pageViewsMap.entries())
      .map(([page, viewCount]) => ({ page, views: viewCount }))
      .sort((a, b) => b.views - a.views);

    // Unique visitors
    const uniqueIPs = new Set(
      views.map((item) => item.ip_address).filter(Boolean) as string[]
    );

    // Daily stats
    const dailyMap = new Map<string, { views: number; ips: Set<string> }>();
    views.forEach((item) => {
      const dateKey = new Date(item._creationTime).toISOString().split("T")[0];
      const entry = dailyMap.get(dateKey) || { views: 0, ips: new Set<string>() };
      entry.views += 1;
      if (item.ip_address) entry.ips.add(item.ip_address);
      dailyMap.set(dateKey, entry);
    });

    const dailyStats = [];
    for (let i = args.days - 1; i >= 0; i--) {
      const date = new Date(endDate - i * 24 * 60 * 60 * 1000);
      const dateKey = date.toISOString().split("T")[0];
      const entry = dailyMap.get(dateKey);
      dailyStats.push({
        date: dateKey,
        views: entry?.views || 0,
        visitors: entry ? entry.ips.size || entry.views : 0,
      });
    }

    // Recent activity
    const recentActivity = all.slice(0, 20);

    return {
      totalViews: views.length,
      uniqueVisitors: uniqueIPs.size,
      pageViews,
      dailyStats,
      recentActivity,
    };
  },
});

const MAX_EVENT_DATA_CHARS = 2000;
const clip = (value: string | undefined, max: number) => (value ? value.slice(0, max) : undefined);

// Public: anonymous usage events from the site. No IP address or browser details are stored, and
// every field is size-limited so the table can't be filled with junk.
export const track = mutation({
  args: {
    event_type: v.string(),
    event_data: v.optional(v.any()),
    // Accepted for older clients, but not stored
    user_agent: v.optional(v.string()),
    ip_address: v.optional(v.string()),
    referrer: v.optional(v.string()),
    page_url: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const event_type = args.event_type.trim().slice(0, 64);
    if (!/^[a-z0-9_.:-]+$/i.test(event_type)) return null;

    let event_data = args.event_data;
    if (event_data !== undefined && JSON.stringify(event_data).length > MAX_EVENT_DATA_CHARS) {
      event_data = undefined;
    }

    return await ctx.db.insert("analytics", {
      event_type,
      event_data,
      referrer: clip(args.referrer, 300),
      page_url: clip(args.page_url, 300),
    });
  },
});
