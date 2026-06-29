import SeasonView from "@/components/content/SeasonView";

export default async function SeasonsPage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { id } = await params;

  return <SeasonView id={id} />;
}
