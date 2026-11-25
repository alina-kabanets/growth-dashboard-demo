import { Dashboard } from "@/components/dashboard";
import { Shell } from "@/components/shell";
import { buildDashboard } from "@/lib/dashboard-data";

// Everything is computed at build time; the page is static.
export default function Page() {
  const data = buildDashboard();
  return (
    <Shell>
      <Dashboard data={data} />
    </Shell>
  );
}
