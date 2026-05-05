/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as applicationPackage from "../applicationPackage.js";
import type * as applicationPackageAgents from "../applicationPackageAgents.js";
import type * as applicationPackageModel from "../applicationPackageModel.js";
import type * as importedCv from "../importedCv.js";
import type * as profile from "../profile.js";
import type * as profileModel from "../profileModel.js";
import type * as vacancy from "../vacancy.js";
import type * as vacancyAgents from "../vacancyAgents.js";
import type * as vacancyModel from "../vacancyModel.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  applicationPackage: typeof applicationPackage;
  applicationPackageAgents: typeof applicationPackageAgents;
  applicationPackageModel: typeof applicationPackageModel;
  importedCv: typeof importedCv;
  profile: typeof profile;
  profileModel: typeof profileModel;
  vacancy: typeof vacancy;
  vacancyAgents: typeof vacancyAgents;
  vacancyModel: typeof vacancyModel;
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
