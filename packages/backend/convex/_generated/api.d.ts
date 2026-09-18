/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as combat_resolve from "../combat/resolve.js";
import type * as combat_rules from "../combat/rules.js";
import type * as healthCheck from "../healthCheck.js";
import type * as lib_roomCode from "../lib/roomCode.js";
import type * as photos from "../photos.js";
import type * as rooms from "../rooms.js";
import type * as rounds from "../rounds.js";
import type * as shared_contracts from "../shared/contracts.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "combat/resolve": typeof combat_resolve;
  "combat/rules": typeof combat_rules;
  healthCheck: typeof healthCheck;
  "lib/roomCode": typeof lib_roomCode;
  photos: typeof photos;
  rooms: typeof rooms;
  rounds: typeof rounds;
  "shared/contracts": typeof shared_contracts;
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
