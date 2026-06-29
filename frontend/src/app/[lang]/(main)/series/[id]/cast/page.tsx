import CastView from "@/components/content/CastView";

export default async function CastPage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { id } = await params;

  return <CastView type="series" id={id} />;
}
