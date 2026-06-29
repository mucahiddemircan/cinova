import { Metadata } from "next";
import PersonDetailsView from "@/components/content/PersonDetailsView";
import { peopleApi } from "@/lib/api/metadata";
import { BRAND_NAME } from "@/constants";

type Props = {
  params: Promise<{ lang: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const person = await peopleApi.getPersonDetails(id);
    if (!person) return { title: BRAND_NAME };

    return {
      title: `${person.name} | ${BRAND_NAME}`,
      description: person.biography?.slice(0, 160),
      openGraph: {
        title: person.name,
        description: person.biography,
        images: person.profile_path ? [person.profile_path] : [],
      },
    };
  } catch (error) {
    return { title: BRAND_NAME };
  }
}

export default async function PersonDetailsPage({ params }: Props) {
  const { id } = await params;
  return <PersonDetailsView id={id} />;
}
