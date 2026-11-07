/**
 * Admin-only functions.
 *
 * Every Convex function is callable by anyone who knows the deployment URL, so anything that reads
 * private data (contact messages, analytics) or changes the site must check the admin session first.
 * `adminQuery` / `adminMutation` add a required `adminToken` argument and reject the call unless it
 * belongs to a signed-in, unexpired admin session. The admin app sends the token automatically.
 */
import { ConvexError, v, type ObjectType, type PropertyValidators } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";

export async function requireAdmin(ctx: QueryCtx, token: string): Promise<{ email: string }> {
  const session = token
    ? await ctx.db
        .query("admin_sessions")
        .withIndex("by_token", (q) => q.eq("token", token))
        .first()
    : null;
  if (!session || session.expires_at < Date.now()) {
    throw new ConvexError("Not authorized");
  }
  return { email: session.email };
}

export function adminQuery<Args extends PropertyValidators, R>(def: {
  args?: Args;
  handler: (ctx: QueryCtx, args: ObjectType<Args>) => R | Promise<R>;
}) {
  return query({
    args: { ...(def.args ?? ({} as Args)), adminToken: v.string() },
    handler: async (ctx, { adminToken, ...rest }) => {
      await requireAdmin(ctx, adminToken);
      return await def.handler(ctx, rest as unknown as ObjectType<Args>);
    },
  });
}

export function adminMutation<Args extends PropertyValidators, R>(def: {
  args?: Args;
  handler: (ctx: MutationCtx, args: ObjectType<Args>) => R | Promise<R>;
}) {
  return mutation({
    args: { ...(def.args ?? ({} as Args)), adminToken: v.string() },
    handler: async (ctx, { adminToken, ...rest }) => {
      await requireAdmin(ctx, adminToken);
      return await def.handler(ctx, rest as unknown as ObjectType<Args>);
    },
  });
}
