import { SpecifyVacancyApp } from "@/components/vacancy/specify-vacancy-app";
import type { Id } from "@/convex/_generated/dataModel";

export default async function SpecifyVacancyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <SpecifyVacancyApp
      vacancyUnderstandingId={id as Id<"vacancyUnderstandings">}
    />
  );
}
