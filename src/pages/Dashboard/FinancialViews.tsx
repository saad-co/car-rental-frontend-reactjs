import CollectionsPanel from "../../components/dashboard/financial/CollectionsPanel";
import RevenueByDriverPanel from "../../components/dashboard/financial/RevenueByDriverPanel";
import Tabs from "../../components/ui/tabs/Tabs";
import Home from "./Home";

/**
 * Dashboard page 2, financial views and analytics (D93): collections per month, week, day and custom range, revenue per
 * driver, and the statistics the dashboard showed before the daily operations page (D88), kept as they were. Page 1, the
 * daily operations, is the default page; this one is "Financial views" in the menu.
 */
export default function FinancialViews() {
  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-display text-title-sm font-semibold text-gray-900">
          Financial views
        </h1>
        <p className="mt-1 text-theme-sm text-gray-500">
          What was collected, by period and by driver, and the statistics.
        </p>
      </header>
      <Tabs
        tabs={[
          {
            id: "collections",
            label: "Collections",
            content: <CollectionsPanel />,
          },
          {
            id: "revenue",
            label: "Revenue per driver",
            content: <RevenueByDriverPanel />,
          },
          { id: "statistics", label: "Statistics", content: <Home /> },
        ]}
      />
    </div>
  );
}
