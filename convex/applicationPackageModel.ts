import { v } from "convex/values";

export const applicationPackageProfilePictureOverrideValidator = v.union(
  v.object({ kind: v.literal("inherit") }),
  v.object({ kind: v.literal("none") }),
  v.object({ kind: v.literal("url"), url: v.string() }),
  v.object({ kind: v.literal("storage"), storageId: v.id("_storage") }),
);
