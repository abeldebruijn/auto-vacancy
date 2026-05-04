import type { Id } from "@/convex/_generated/dataModel";

export function vacancyReviewPath(slug: string, id: Id<"vacancyUnderstandings">) {
  return `/vacancies/${slug}-${id}`;
}

export function statusLabel(status: string) {
  switch (status) {
    case "processing":
      return "Processing";
    case "needs_homepage":
      return "Needs company homepage";
    case "asking_questions":
      return "Asking questions";
    case "ready":
      return "Ready";
    case "failed":
      return "Failed";
    default:
      return status;
  }
}
