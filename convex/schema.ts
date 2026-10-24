// schema.ts

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  projects: defineTable({
    title: v.string(),
    description: v.string(),
    // Extended fields (added to match seed data)
    category: v.optional(v.string()),
    year: v.optional(v.string()),
    about: v.optional(v.string()),
    gradient: v.optional(v.string()),
    is_active: v.optional(v.boolean()),
    // Optional media / links
    image_url: v.optional(v.string()),
    live_url: v.optional(v.string()),
    github_url: v.optional(v.string()),
    // Stack / technologies
    technologies: v.array(v.string()),
    featured: v.boolean(),
    order_index: v.number(),
  })
    .index("by_order", ["order_index"])
    .index("by_featured", ["featured"]),

  certificates: defineTable({
    title: v.string(),
    issuer: v.string(),
    issue_date: v.string(),
    credential_id: v.optional(v.string()),
    credential_url: v.optional(v.string()),
    verification_image_url: v.optional(v.string()),
    image_url: v.optional(v.string()),
    description: v.optional(v.string()),
    order_index: v.number(),
    type: v.optional(v.union(v.literal("participation"), v.literal("recognition"))),
  }).index("by_order", ["order_index"]),

  contact_messages: defineTable({
    name: v.string(),
    email: v.string(),
    subject: v.optional(v.string()),
    message: v.string(),
    status: v.union(
      v.literal("unread"),
      v.literal("read"),
      v.literal("replied"),
      v.literal("archived")
    ),
  }).index("by_status", ["status"]),

  analytics: defineTable({
    event_type: v.string(),
    event_data: v.optional(v.any()),
    user_agent: v.optional(v.string()),
    ip_address: v.optional(v.string()),
    referrer: v.optional(v.string()),
    page_url: v.optional(v.string()),
  }).index("by_event_type", ["event_type"]),

  work_experience: defineTable({
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
  }).index("by_order", ["order_index"]),

  education: defineTable({
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
    achievements: v.array(
      v.object({
        title: v.string(),
        detail: v.optional(v.string()),
        group: v.union(v.literal("Recognition"), v.literal("Leadership & activities")),
      })
    ),
    // Photo for the education card (uploaded from the admin)
    image_url: v.optional(v.string()),
    order_index: v.number(),
  }).index("by_order", ["order_index"]),

  tools: defineTable({
    name: v.string(),
    icon_url: v.string(),
    category: v.string(),
    description: v.optional(v.string()),
    is_active: v.boolean(),
  }),

  hero_settings: defineTable({
    type: v.union(
      v.literal("badge"),
      v.literal("resume"),
      v.literal("profile_image"),
      v.literal("hover_logo"),
      // which 3D portrait the hero shows (value: one of PORTRAIT_STYLES in heroSettings.ts)
      v.literal("portrait_style"),
      // grayscale depth map of the profile photo, for the "depth" portrait style
      v.literal("depth_map")
    ),
    value: v.string(),
    order_index: v.number(),
    is_active: v.boolean(),
  }).index("by_type", ["type"]),

  about_section_images: defineTable({
    image_url: v.string(),
    label: v.string(),
    order_index: v.number(),
    is_active: v.boolean(),
  }).index("by_order", ["order_index"]),

  skill_categories: defineTable({
    title: v.string(),
    icon_slug: v.string(),
    color_slug: v.string(),
    skills: v.array(v.string()),
    order_index: v.number(),
    is_active: v.boolean(),
  }).index("by_order", ["order_index"]),

  admin_sessions: defineTable({
    email: v.string(),
    token: v.string(),
    expires_at: v.number(),
  }).index("by_token", ["token"]),
});
