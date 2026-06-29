import CommentsView from "@/components/content/CommentsView";

export default async function MovieCommentsPage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { id } = await params;

  return <CommentsView type="movie" id={id} />;
}
