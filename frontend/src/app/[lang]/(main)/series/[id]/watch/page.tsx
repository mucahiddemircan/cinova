import WatchView from "@/components/content/WatchView";

export default async function WatchPage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { id } = await params;

  return <WatchView type="series" id={id} />;
}
