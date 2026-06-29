import { Metadata } from "next";
import ProfileOverview from "@/components/profile/ProfileOverview";
import { userApi } from "@/lib/api";
import { BRAND_NAME } from "@/constants";

type Props = {
  params: Promise<{ lang: string; username: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  try {
    const profile = await userApi.getByUsername(username);
    if (!profile) return { title: BRAND_NAME };

    return {
      title: `${profile.username} | ${BRAND_NAME}`,
      description: `${profile.username}'s profile on ${BRAND_NAME}.`,
      openGraph: {
        title: profile.username,
        images: profile.avatar_url ? [profile.avatar_url] : [],
      },
    };
  } catch (error) {
    return { title: `${username} | ${BRAND_NAME}` };
  }
}

export default async function ProfileOverviewPage({ params }: Props) {
  const { username } = await params;
  return <ProfileOverview username={username} />;
}
