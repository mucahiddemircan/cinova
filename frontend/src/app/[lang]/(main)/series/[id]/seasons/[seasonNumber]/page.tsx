import SeasonView from "@/components/content/SeasonView";

export default async function SeasonDetailsPage({
  params,
}: {
  params: Promise<{ lang: string; id: string; seasonNumber: string }>;
}) {
  const { id, seasonNumber } = await params;

  return <SeasonView id={id} seasonNumber={seasonNumber} />;
}
