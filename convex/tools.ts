import { query, mutation, internalMutation } from "./_generated/server";
import { adminMutation } from "./auth";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("tools").collect();
  },
});

export const listActive = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("tools").collect();
    return all.filter((t) => t.is_active);
  },
});

export const getById = query({
  args: { id: v.id("tools") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = adminMutation({
  args: {
    name: v.string(),
    icon_url: v.string(),
    category: v.string(),
    description: v.optional(v.string()),
    is_active: v.boolean(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("tools", args);
  },
});

export const update = adminMutation({
  args: {
    id: v.id("tools"),
    name: v.optional(v.string()),
    icon_url: v.optional(v.string()),
    category: v.optional(v.string()),
    description: v.optional(v.string()),
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
  args: { id: v.id("tools") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const toggleActive = adminMutation({
  args: { id: v.id("tools"), is_active: v.boolean() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { is_active: args.is_active });
    return await ctx.db.get(args.id);
  },
});

// Migration: fix broken Supabase icon URLs → devicon CDN
export const fixBrokenIconUrls = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cdnBase = "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons";

    // Map tool names (case-insensitive) to devicon paths
    const iconMap: Record<string, string> = {
      // Languages
      "javascript": `${cdnBase}/javascript/javascript-original.svg`,
      "typescript": `${cdnBase}/typescript/typescript-original.svg`,
      "python": `${cdnBase}/python/python-original.svg`,
      "java": `${cdnBase}/java/java-original.svg`,
      "c#": `${cdnBase}/csharp/csharp-original.svg`,
      "csharp": `${cdnBase}/csharp/csharp-original.svg`,
      "c++": `${cdnBase}/cplusplus/cplusplus-original.svg`,
      "php": `${cdnBase}/php/php-original.svg`,
      "ruby": `${cdnBase}/ruby/ruby-original.svg`,
      "swift": `${cdnBase}/swift/swift-original.svg`,
      "kotlin": `${cdnBase}/kotlin/kotlin-original.svg`,
      "go": `${cdnBase}/go/go-original.svg`,
      "rust": `${cdnBase}/rust/rust-original.svg`,
      "dart": `${cdnBase}/dart/dart-original.svg`,
      "html": `${cdnBase}/html5/html5-original.svg`,
      "html5": `${cdnBase}/html5/html5-original.svg`,
      "css": `${cdnBase}/css3/css3-original.svg`,
      "css3": `${cdnBase}/css3/css3-original.svg`,
      "sass": `${cdnBase}/sass/sass-original.svg`,

      // Frameworks & Libraries
      "react": `${cdnBase}/react/react-original.svg`,
      "react native": `${cdnBase}/react/react-original.svg`,
      "next.js": `${cdnBase}/nextjs/nextjs-original.svg`,
      "nextjs": `${cdnBase}/nextjs/nextjs-original.svg`,
      "vue": `${cdnBase}/vuejs/vuejs-original.svg`,
      "vue.js": `${cdnBase}/vuejs/vuejs-original.svg`,
      "angular": `${cdnBase}/angular/angular-original.svg`,
      "svelte": `${cdnBase}/svelte/svelte-original.svg`,
      "node.js": `${cdnBase}/nodejs/nodejs-original.svg`,
      "nodejs": `${cdnBase}/nodejs/nodejs-original.svg`,
      "express": `${cdnBase}/express/express-original.svg`,
      "express.js": `${cdnBase}/express/express-original.svg`,
      "django": `${cdnBase}/django/django-plain.svg`,
      "flask": `${cdnBase}/flask/flask-original.svg`,
      "spring": `${cdnBase}/spring/spring-original.svg`,
      "laravel": `${cdnBase}/laravel/laravel-original.svg`,
      "flutter": `${cdnBase}/flutter/flutter-original.svg`,
      "tailwindcss": `${cdnBase}/tailwindcss/tailwindcss-original.svg`,
      "tailwind css": `${cdnBase}/tailwindcss/tailwindcss-original.svg`,
      "tailwind": `${cdnBase}/tailwindcss/tailwindcss-original.svg`,
      "bootstrap": `${cdnBase}/bootstrap/bootstrap-original.svg`,
      "jquery": `${cdnBase}/jquery/jquery-original.svg`,
      ".net": `${cdnBase}/dot-net/dot-net-original.svg`,
      "dotnet": `${cdnBase}/dot-net/dot-net-original.svg`,
      "redux": `${cdnBase}/redux/redux-original.svg`,
      "graphql": `${cdnBase}/graphql/graphql-plain.svg`,
      "astro": `${cdnBase}/astro/astro-original.svg`,
      "vite": `${cdnBase}/vitejs/vitejs-original.svg`,
      "electron": `${cdnBase}/electron/electron-original.svg`,

      // Databases
      "mongodb": `${cdnBase}/mongodb/mongodb-original.svg`,
      "postgresql": `${cdnBase}/postgresql/postgresql-original.svg`,
      "mysql": `${cdnBase}/mysql/mysql-original.svg`,
      "redis": `${cdnBase}/redis/redis-original.svg`,
      "firebase": `${cdnBase}/firebase/firebase-original.svg`,
      "supabase": `${cdnBase}/supabase/supabase-original.svg`,
      "sqlite": `${cdnBase}/sqlite/sqlite-original.svg`,

      // Tools & Platforms
      "git": `${cdnBase}/git/git-original.svg`,
      "github": `${cdnBase}/github/github-original.svg`,
      "gitlab": `${cdnBase}/gitlab/gitlab-original.svg`,
      "docker": `${cdnBase}/docker/docker-original.svg`,
      "kubernetes": `${cdnBase}/kubernetes/kubernetes-original.svg`,
      "aws": `${cdnBase}/amazonwebservices/amazonwebservices-original-wordmark.svg`,
      "azure": `${cdnBase}/azure/azure-original.svg`,
      "gcp": `${cdnBase}/googlecloud/googlecloud-original.svg`,
      "google cloud": `${cdnBase}/googlecloud/googlecloud-original.svg`,
      "vercel": `${cdnBase}/vercel/vercel-original.svg`,
      "netlify": `${cdnBase}/netlify/netlify-original.svg`,
      "heroku": `${cdnBase}/heroku/heroku-original.svg`,
      "linux": `${cdnBase}/linux/linux-original.svg`,
      "nginx": `${cdnBase}/nginx/nginx-original.svg`,
      "apache": `${cdnBase}/apache/apache-original.svg`,

      // IDEs & Editors
      "vscode": `${cdnBase}/vscode/vscode-original.svg`,
      "visual studio code": `${cdnBase}/vscode/vscode-original.svg`,
      "vs code": `${cdnBase}/vscode/vscode-original.svg`,
      "intellij": `${cdnBase}/intellij/intellij-original.svg`,
      "webstorm": `${cdnBase}/webstorm/webstorm-original.svg`,
      "android studio": `${cdnBase}/androidstudio/androidstudio-original.svg`,

      // Design
      "figma": `${cdnBase}/figma/figma-original.svg`,
      "photoshop": `${cdnBase}/photoshop/photoshop-original.svg`,
      "illustrator": `${cdnBase}/illustrator/illustrator-plain.svg`,
      "canva": `${cdnBase}/canva/canva-original.svg`,
      "xd": `${cdnBase}/xd/xd-original.svg`,

      // Testing
      "jest": `${cdnBase}/jest/jest-plain.svg`,
      "cypress": `${cdnBase}/cypressio/cypressio-original.svg`,

      // Other
      "npm": `${cdnBase}/npm/npm-original-wordmark.svg`,
      "yarn": `${cdnBase}/yarn/yarn-original.svg`,
      "webpack": `${cdnBase}/webpack/webpack-original.svg`,
      "babel": `${cdnBase}/babel/babel-original.svg`,
      "postman": `${cdnBase}/postman/postman-original.svg`,
      "jira": `${cdnBase}/jira/jira-original.svg`,
      "slack": `${cdnBase}/slack/slack-original.svg`,
      "notion": `${cdnBase}/notion/notion-original.svg`,
      "trello": `${cdnBase}/trello/trello-original.svg`,
      "ubuntu": `${cdnBase}/ubuntu/ubuntu-original.svg`,
      "windows": `${cdnBase}/windows11/windows11-original.svg`,
      "android": `${cdnBase}/android/android-original.svg`,
      "apple": `${cdnBase}/apple/apple-original.svg`,
      "prisma": `${cdnBase}/prisma/prisma-original.svg`,
      "mongoose": `${cdnBase}/mongoose/mongoose-original.svg`,
      "convex": "https://cdn.sanity.io/images/ts10onj4/production/d4e898a87ba0e7bff3a9e6bbca0ae9b96fc04b5f-24x24.svg",
      "framer motion": `${cdnBase}/framermotion/framermotion-original.svg`,
      "framer": `${cdnBase}/framermotion/framermotion-original.svg`,
      "three.js": `${cdnBase}/threejs/threejs-original.svg`,
      "threejs": `${cdnBase}/threejs/threejs-original.svg`,
      "material ui": `${cdnBase}/materialui/materialui-original.svg`,
      "mui": `${cdnBase}/materialui/materialui-original.svg`,
      "storybook": `${cdnBase}/storybook/storybook-original.svg`,
      "markdown": `${cdnBase}/markdown/markdown-original.svg`,
      "bash": `${cdnBase}/bash/bash-original.svg`,
      "powershell": `${cdnBase}/powershell/powershell-original.svg`,

      // AI Tools
      "chatgpt": "https://cdn.worldvectorlogo.com/logos/chatgpt-6.svg",
      "claude": "https://cdn.worldvectorlogo.com/logos/claude-ai-icon.svg",
      "gemini": "https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690b6.svg",
      "deepseek": "https://cdn.prod.website-files.com/6744e9a3e9e43ab1e4c60e2f/6744e9a3e9e43ab1e4c60eda_Group%201.svg",
      "augmentcode": "https://avatars.githubusercontent.com/u/157953626?s=200&v=4",
      "windsurf": "https://codeium.com/favicon.svg",
      "cursor": "https://www.cursor.com/favicon.ico",
      "kimik2": "https://avatars.githubusercontent.com/u/141432295?s=200&v=4",

      // Dev Tools & IDEs
      "netbeans": `${cdnBase}/netbeans/netbeans-original.svg`,
      "latex": `${cdnBase}/latex/latex-original.svg`,
      "xampp": "https://upload.wikimedia.org/wikipedia/commons/0/03/Xampp_logo.svg",
      "packet tracer": "https://upload.wikimedia.org/wikipedia/en/d/dc/Cisco_Packet_Tracer_Icon.png",
      "railway": "https://railway.app/brand/logo-light.svg",
    };

    const all = await ctx.db.query("tools").collect();
    let fixed = 0;
    const skipped: string[] = [];

    for (const tool of all) {
      // Only fix broken supabase URLs
      if (!tool.icon_url.includes("supabase.co")) continue;

      const key = tool.name.toLowerCase().trim();
      const newUrl = iconMap[key];

      if (newUrl) {
        await ctx.db.patch(tool._id, { icon_url: newUrl });
        fixed++;
      } else {
        skipped.push(tool.name);
      }
    }

    return { fixed, skipped, total: all.length };
  },
});

// Migration: remove order_index and ring fields from all tools
export const removeExtraFields = internalMutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("tools").collect();
    let fixed = 0;
    for (const tool of all) {
      const doc = tool as any;
      if (doc.order_index !== undefined || doc.ring !== undefined) {
        // Replace document: delete and re-insert without extra fields
        const { _id, _creationTime, order_index, ring, ...clean } = doc;
        await ctx.db.delete(_id);
        await ctx.db.insert("tools", clean);
        fixed++;
      }
    }
    return { fixed, total: all.length };
  },
});
