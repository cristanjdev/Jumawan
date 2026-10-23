/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as aboutSectionImages from "../aboutSectionImages.js";
import type * as analytics from "../analytics.js";
import type * as certificates from "../certificates.js";
import type * as contactMessages from "../contactMessages.js";
import type * as dashboard from "../dashboard.js";
import type * as education from "../education.js";
import type * as files from "../files.js";
import type * as heroSettings from "../heroSettings.js";
import type * as http from "../http.js";
import type * as projects from "../projects.js";
import type * as skillCategories from "../skillCategories.js";
import type * as tools from "../tools.js";
import type * as workExperience from "../workExperience.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  aboutSectionImages: typeof aboutSectionImages;
  analytics: typeof analytics;
  certificates: typeof certificates;
  contactMessages: typeof contactMessages;
  dashboard: typeof dashboard;
  education: typeof education;
  files: typeof files;
  heroSettings: typeof heroSettings;
  http: typeof http;
  projects: typeof projects;
  skillCategories: typeof skillCategories;
  tools: typeof tools;
  workExperience: typeof workExperience;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
