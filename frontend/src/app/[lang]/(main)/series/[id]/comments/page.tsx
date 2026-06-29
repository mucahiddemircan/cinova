import CommentsView from "@/components/content/CommentsView";

export default async function SeriesCommentsPage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { id } = await params;

  return <CommentsView type="series" id={id} />;
}
