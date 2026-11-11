import type { DailyOperations } from "../../../api/dashboard.queries";
import { formatCents, formatDateTime } from "../../../utils";
import BalanceText from "../../drivers/BalanceText";
import type { Column } from "../../tables/DataTable";
import Badge from "../../ui/badge/Badge";
import { plural } from "../dashboardFormat";
import DailyCard from "./DailyCard";

type Collections = DailyOperations["collections"];

const COLUMNS: Column<Collections["drivers"][number]>[] = [
  {
    key: "driver",
    header: "Driver",
    render: (row) => (
      <span className="font-medium text-gray-800">{row.name}</span>
    ),
  },
  {
    key: "balance",
    header: "Balance owed",
    className: "num whitespace-nowrap",
    render: (row) => <BalanceText cents={row.balanceCents} />,
  },
  {
    key: "status",
    header: "Status",
    render: () => (
      <Badge size="sm" color="error">
        In Collections
      </Badge>
    ),
  },
  {
    key: "sent",
    header: "Sent",
    className: "whitespace-nowrap",
    render: (row) => formatDateTime(row.sentToCollectionsAt),
  },
];

/**
 * Collections (D9): the drivers staff sent to collections, with what they owe. This is the existing Collections feature
 * (D81) shown here; staff set and remove the status on the driver page.
 */
export default function CollectionsCard({ data }: { data: Collections }) {
  return (
    <DailyCard
      title="Collections"
      subtitle={`${plural(data.drivers.length, "driver")} in collections, ${formatCents(data.totalOwedCents)} owed in total`}
      link={{ to: "/admin/collections", label: "Open Collections" }}
      columns={COLUMNS}
      rows={data.drivers}
      emptyText="Nobody is in collections."
      scroll
    />
  );
}
