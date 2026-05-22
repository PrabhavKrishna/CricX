import { redirect } from "next/navigation";

export default function CreateCatchAllPage({ params }: { params: { slug?: string[] } }) {
  const slug = params?.slug || [];
  const dest = slug.length > 0 ? `/dashboard/create/${slug.join("/")}` : "/dashboard";
  // Redirect legacy /create/* routes to dashboard-scoped create pages
  redirect(dest);
}
