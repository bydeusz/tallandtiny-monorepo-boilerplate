import {
  Dashboard,
  DashboardSidebar,
  DashboardNavigation,
  DashboardContent,
} from "@/components/layout/dashboard";
import { DashboardLinks } from "@/components/layout/dashboard-links";
import { Thumbnail } from "@/components/layout/thumbnail";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Dashboard>
      <DashboardSidebar thumbnail={<Thumbnail />}>
        <DashboardNavigation>
          <DashboardLinks />
        </DashboardNavigation>
      </DashboardSidebar>
      <DashboardContent>{children}</DashboardContent>
    </Dashboard>
  );
}
