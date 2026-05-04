import { VacancyDetailApp } from "@/components/vacancy/vacancy-detail-app";

export default async function VacancyDetailPage({
  params,
}: {
  params: Promise<{ slugId: string }>;
}) {
  const { slugId } = await params;
  return <VacancyDetailApp slugId={slugId} />;
}
