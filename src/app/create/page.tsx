import { redirect } from "next/navigation";

export default function CreateIndexPage() {
  // Redirect bare /create to the dashboard
  redirect("/dashboard");
}
