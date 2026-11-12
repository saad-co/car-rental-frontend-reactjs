import { Link, useNavigate } from "react-router";
import { useDrivers, type Driver } from "../../api/drivers.queries";
import BalanceText from "../../components/drivers/BalanceText";
import DriverStatusBadge from "../../components/drivers/DriverStatusBadge";
import DataTable, { type Column } from "../../components/tables/DataTable";
import RowActionsMenu from "../../components/tables/RowActionsMenu";
import {
  ARCHIVED_FILTER,
  archivedFilterGroup,
} from "../../components/tables/archivedFilter";
import TableCard from "../../components/tables/TableCard";
import {
  LIST_PAGE_SIZE,
  pageCount,
  useListParams,
} from "../../components/tables/useListParams";
import AvatarText from "../../components/ui/avatar/AvatarText";
import { formatUsPhone } from "../../utils";

/** The Status filter: every driver by default; `?status=active` or `?status=inactive` narrows it. */
const STATUS_URL_VALUES = ["active", "inactive"];
const STATUS_OPTIONS = [
  { label: "All", value: undefined },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
];

const columns: Column<Driver>[] = [
  {
    key: "driver",
    header: "Driver",
    render: (driver) => {
      const name = `${driver.firstName} ${driver.lastName}`;
      return (
        <div className="flex items-center gap-3">
          <AvatarText name={name} />
          <div className="min-w-0">
            {/* A real link too, so the row works with the keyboard and middle-click. */}
            <Link
              to={`/admin/drivers/${driver.id}/ledger`}
              onClick={(event) => event.stopPropagation()}
              className="block font-medium text-gray-800 hover:text-brand-500"
            >
              {name}
            </Link>
            <span className="block text-gray-500">{driver.email}</span>
          </div>
        </div>
      );
    },
  },
  {
    key: "phone",
    header: "Phone",
    className: "whitespace-nowrap",
    render: (driver) => formatUsPhone(driver.phone),
  },
  {
    key: "status",
    header: "Status",
    render: (driver) => <DriverStatusBadge driver={driver} />,
  },
  {
    key: "balance",
    header: "Balance",
    align: "end",
    className: "whitespace-nowrap",
    render: (driver) => <BalanceText cents={driver.balanceCents} />,
  },
  {
    key: "actions",
    header: "",
    align: "end",
    className: "w-px",
    render: (driver) => (
      <RowActionsMenu
        label={`Actions for ${driver.firstName} ${driver.lastName}`}
        actions={[
          { label: "View ledger", to: `/admin/drivers/${driver.id}/ledger` },
          { label: "View driver", to: `/admin/drivers/${driver.id}` },
        ]}
      />
    ),
  },
];

/**
 * "Ledgers" (Fleet revisions section 5, right below Payments in the menu): every driver's ledger in one searchable list
 * with the balance and the status, so a ledger can be opened without going through the Drivers page. The same drivers
 * query and shared table as the Drivers and Collections lists, 8 rows per page, the view in the URL. It lists every driver
 * who has been through onboarding (active, inactive, in collections); people still in onboarding have no ledger to look at.
 */
export default function LedgersList() {
  const navigate = useNavigate();
  const view = useListParams({
    status: STATUS_URL_VALUES,
    ...ARCHIVED_FILTER,
  });
  const archivedOnly = view.filters.show === "archived";

  const { data, isPending, isError, error, isPlaceholderData } = useDrivers({
    status: view.filters.status as "active" | "inactive" | undefined,
    onboarding: false,
    archived: archivedOnly || undefined,
    search: view.search || undefined,
    page: view.page,
    limit: LIST_PAGE_SIZE,
  });

  return (
    <div className="space-y-6">
      <TableCard
        title="Ledgers"
        search={{
          value: view.search,
          onSearch: view.setSearch,
          placeholder: "Search name, email, phone...",
        }}
        filters={{
          groups: [
            {
              key: "status",
              label: "Status",
              options: STATUS_OPTIONS,
              value: view.filters.status,
            },
            archivedFilterGroup(view.filters.show),
          ],
          onApply: (values) =>
            view.setFilters({ status: values.status, show: values.show }),
        }}
        onClearAll={view.clearAll}
        isPending={isPending}
        error={isError ? error : null}
        isEmpty={data?.items.length === 0}
        emptyText={
          view.search || view.filters.status || archivedOnly
            ? "No ledgers match this search or filter."
            : "No ledgers yet: a driver's ledger starts once they are a driver."
        }
        page={view.page}
        totalPages={data ? pageCount(data.total) : 1}
        onPageChange={view.setPage}
      >
        {data && (
          <DataTable
            columns={columns}
            rows={data.items}
            rowKey={(driver) => driver.id}
            onRowClick={(driver) =>
              void navigate(`/admin/drivers/${driver.id}/ledger`)
            }
            dimmed={isPlaceholderData}
          />
        )}
      </TableCard>
    </div>
  );
}
