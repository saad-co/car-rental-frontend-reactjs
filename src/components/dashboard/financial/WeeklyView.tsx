import { useState } from "react";
import { useCollections } from "../../../api/dashboard.queries";
import { ChevronLeftIcon } from "../../../icons";
import { addDays, chicagoToday, formatCents } from "../../../utils";
import { plural } from "../dashboardFormat";
import DashboardCard from "../DashboardCard";
import Button from "../../ui/button/Button";
import { LIST_PAGE_SIZE } from "../../tables/useListParams";
import PeriodsTable from "./PeriodsTable";
import { mondayOf, weekLabel } from "./financialFormat";

/**
 * The weekly view: the week selector (arrows, or a click on a week of the list) with that week's total, and the list of every
 * week, Monday to Sunday in Chicago (D93). The selected week's total is asked of the same endpoint as the list, limited to
 * that week's days, so the two can never disagree.
 */
export default function WeeklyView() {
  const currentMonday = mondayOf(chicagoToday());
  const [selected, setSelected] = useState(currentMonday);
  const [page, setPage] = useState(1);

  const list = useCollections({
    view: "weekly",
    page,
    limit: LIST_PAGE_SIZE,
  });
  const selectedEnd = addDays(selected, 6);
  const week = useCollections({
    view: "weekly",
    from: selected,
    to: selectedEnd,
    page: 1,
    limit: 1,
  });

  // The list starts at the first week with a payment: there is nothing older to switch to.
  const weekCount = list.data?.total ?? 0;
  const oldest =
    weekCount > 0
      ? addDays(currentMonday, -7 * (weekCount - 1))
      : currentMonday;

  return (
    <div className="space-y-4">
      <DashboardCard
        title="Selected week"
        subtitle="Confirmed payments, Monday to Sunday (Chicago)"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={selected <= oldest}
            onClick={() => setSelected(addDays(selected, -7))}
            startIcon={<ChevronLeftIcon className="size-4" />}
          >
            Older week
          </Button>
          <div className="text-center">
            <p className="text-theme-sm font-medium text-gray-800">
              {selected === currentMonday ? "This week" : "Week"}
            </p>
            <p className="text-theme-xs text-gray-500">
              {weekLabel(selected, selectedEnd)}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={selected >= currentMonday}
            onClick={() => setSelected(addDays(selected, 7))}
            endIcon={<ChevronLeftIcon className="size-4 rotate-180" />}
          >
            Newer week
          </Button>
        </div>
        <p className="num mt-4 text-center text-title-md font-semibold text-gray-900">
          {week.data ? formatCents(week.data.totalCents) : "…"}
        </p>
        <p className="mt-1 text-center text-theme-xs text-gray-500">
          {week.error
            ? week.error.message
            : week.data
              ? plural(week.data.paymentCount, "payment")
              : "Loading…"}
        </p>
      </DashboardCard>

      <PeriodsTable
        view="weekly"
        data={list.data}
        isPending={list.isPending}
        error={list.error}
        page={page}
        onPageChange={setPage}
        selectedStart={selected}
        onSelect={setSelected}
      />
    </div>
  );
}
