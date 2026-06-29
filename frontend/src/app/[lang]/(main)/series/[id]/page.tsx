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
    const series = await contentApi.getById("series", id);
    if (!series) return { title: BRAND_NAME };

    return {
      title: `${series.title} | ${BRAND_NAME}`,
      description: series.overview?.slice(0, 160),
      openGraph: {
        title: series.title,
        description: series.overview,
        images: series.poster_path ? [series.poster_path] : [],
      },
    };
  } catch (error) {
    return { title: BRAND_NAME };
  }
}

export default async function SeriesDetailsPage({ params }: Props) {
  const { id } = await params;
  return <DetailsView type="series" id={id} />;
}
