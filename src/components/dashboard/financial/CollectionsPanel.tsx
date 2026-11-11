import Tabs from "../../ui/tabs/Tabs";
import CustomRangeView from "./CustomRangeView";
import PeriodsView from "./PeriodsView";
import WeeklyView from "./WeeklyView";

/** Collections (D93): money received per month, week and day, and for any range of days the admin picks. */
export default function CollectionsPanel() {
  return (
    <Tabs
      tabs={[
        {
          id: "monthly",
          label: "Monthly",
          content: <PeriodsView view="monthly" />,
        },
        { id: "weekly", label: "Weekly", content: <WeeklyView /> },
        { id: "daily", label: "Daily", content: <PeriodsView view="daily" /> },
        { id: "range", label: "Custom range", content: <CustomRangeView /> },
      ]}
    />
  );
}
