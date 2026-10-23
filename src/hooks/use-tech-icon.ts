import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

// "Next.js", "NextJS" and "next js" are the same technology; "C#" and "C++" keep their symbol so they stay distinct from "C"
const key = (name: string) => name.toLowerCase().replace(/[^a-z0-9#+]/g, "").replace(/js$/, "");

const DEVICON = "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons";
const SIMPLE = "https://cdn.simpleicons.org";

// Technologies that are variants of one in the Tools list (or of a fallback below) share its icon
const ALIASES: Record<string, string> = {
  googlegeminiai: "gemini", reactnative: "react", blade: "laravel", sveltekit: "svelte", javaswing: "java",
  firestore: "firebase", googlemaps: "googlemapssdk", vercelfunctions: "vercel", nativewind: "tailwindcss",
  djangorestframework: "django", djangochannels: "django",
  hilt: "android", room: "android", retrofit: "android", workmanager: "android",
  windowsforms: "net", netmaui: "net", xaml: "net",
};

// Icons for technologies that are not in the Tools list. A tool added there later takes precedence.
const FALLBACK: Record<string, string> = {
  node: `${DEVICON}/nodejs/nodejs-original.svg`, prisma: `${DEVICON}/prisma/prisma-original.svg`,
  docker: `${DEVICON}/docker/docker-original.svg`, redis: `${DEVICON}/redis/redis-original.svg`,
  go: `${DEVICON}/go/go-original.svg`, django: `${DEVICON}/django/django-plain.svg`,
  fastapi: `${DEVICON}/fastapi/fastapi-original.svg`, flutter: `${DEVICON}/flutter/flutter-original.svg`,
  dart: `${DEVICON}/dart/dart-original.svg`, electron: `${DEVICON}/electron/electron-original.svg`,
  arduino: `${DEVICON}/arduino/arduino-original.svg`, "c#": `${DEVICON}/csharp/csharp-original.svg`,
  c: `${DEVICON}/c/c-original.svg`, net: `${DEVICON}/dotnetcore/dotnetcore-original.svg`,
  angularjs: `${DEVICON}/angularjs/angularjs-original.svg`, android: `${DEVICON}/android/android-original.svg`,
  keras: `${DEVICON}/keras/keras-original.svg`, opencv: `${DEVICON}/opencv/opencv-original.svg`,
  alpine: `${DEVICON}/alpinejs/alpinejs-original.svg`,
  tanstackquery: `${SIMPLE}/reactquery`, tanstackstart: `${SIMPLE}/tanstack`, drizzleorm: `${SIMPLE}/drizzle`,
  hono: `${SIMPLE}/hono`, jwt: `${SIMPLE}/jsonwebtokens`, esp32: `${SIMPLE}/espressif`, pwa: `${SIMPLE}/pwa`,
};

/** Resolves a technology name to its icon URL (Tools list first, then aliases and fallbacks), or undefined */
export function useTechIcon(): (tech: string) => string | undefined {
  const tools = useQuery(api.tools.listActive);

  return useMemo(() => {
    const byName = new Map<string, string>();
    tools?.forEach((tool) => {
      if (!byName.has(key(tool.name))) byName.set(key(tool.name), tool.icon_url);
    });
    return (tech: string) => {
      const k = key(tech);
      const alias = ALIASES[k] ?? k;
      return byName.get(k) ?? byName.get(alias) ?? FALLBACK[alias] ?? FALLBACK[k];
    };
  }, [tools]);
}
