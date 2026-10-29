import { redirect } from "next/navigation";

export default function CeoLegacyRedirect() {
  redirect("/admin");
}
