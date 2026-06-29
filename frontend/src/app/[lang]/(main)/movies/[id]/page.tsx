import { Metadata } from "next";
import DetailsView from "@/components/content/DetailsView";
import { contentApi } from "@/lib/api/content";
import { BRAND_NAME } from "@/constants";

type Props = {
  params: Promise<{ lang: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const movie = await contentApi.getById("movie", id);
    if (!movie) return { title: BRAND_NAME };
    
    return {
      title: `${movie.title} | ${BRAND_NAME}`,
      description: movie.overview?.slice(0, 160),
      openGraph: {
        title: movie.title,
        description: movie.overview,
        images: movie.poster_path ? [movie.poster_path] : [],
      },
    };
  } catch (error) {
    return { title: BRAND_NAME };
  }
}

export default async function MovieDetailsPage({ params }: Props) {
  const { id } = await params;
  return <DetailsView type="movie" id={id} />;
}
