import { redirect } from 'next/navigation';

/** Old address for show pages */
export default function OldSeriesPage({ params }: { params: { slug: string } }) {
  redirect(`/shows/${params.slug}`);
}
