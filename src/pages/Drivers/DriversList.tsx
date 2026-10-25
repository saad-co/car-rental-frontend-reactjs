import BalanceText from "../../components/drivers/BalanceText";
import { Link, useNavigate } from "react-router";
import {
  useDrivers,
  useSetDriverArchived,
  type Driver,
  type DriverStatus,
} from "../../api/drivers.queries";
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
import DriverStatusBadge from "../../components/drivers/DriverStatusBadge";
import { DRIVER_STATUS_LABEL } from "../../components/drivers/driverStatus";
import AvatarText from "../../components/ui/avatar/AvatarText";
import Button from "../../components/ui/button/Button";
import { PlusIcon } from "../../icons";
import { formatDateTime, formatUsPhone } from "../../utils";

/**
 * The statuses listed here: active and inactive only (D80). A driver still in onboarding is on the Approved applications
 * page until the three steps are done.
 */
const LISTED_LABELS = {
  active: DRIVER_STATUS_LABEL.active,
  inactive: DRIVER_STATUS_LABEL.inactive,
};
/**
 * The Status filter: Active is the default (nothing in the URL), Inactive is `?status=inactive`, and `?status=all` lists
 * both. "Driver" means an active or inactive person; people still in onboarding are not drivers yet (Abulkalam, 2026-10-26).
 */
const STATUS_URL_VALUES = ["inactive", "all"];
const STATUS_OPTIONS = [
  { label: LISTED_LABELS.active, value: undefined },
  { label: LISTED_LABELS.inactive, value: "inactive" },
  { label: "All", value: "all" },
];

/** The table's columns; `onArchive` archives or unarchives the row's driver (the "⋯" menu). */
const makeColumns = (onArchive: (driver: Driver) => void): Column<Driver>[] => [
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
              to={`/admin/drivers/${driver.id}`}
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
    key: "since",
    header: "Since",
    render: (driver) => formatDateTime(driver.createdAt),
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
          { label: "View details", to: `/admin/drivers/${driver.id}` },
          {
            label: driver.archivedAt ? "Unarchive" : "Archive",
            onClick: () => onArchive(driver),
          },
        ]}
      />
    ),
  },
];

/**
 * Admin list of drivers, newest first, on the shared table components (B75): search (name, email, phone), a
 * Status filter, 8 rows per page; the view lives in the URL. Only active and inactive drivers are listed (D80); a
 * driver is created by "Start onboarding" on an approved application, or by "Add driver" (D79), and appears here once
 * onboarding is done. Drivers are archived, never deleted: archived ones are hidden, and the Show filter lists them.
 */
export default function DriversList() {
  const navigate = useNavigate();
  const view = useListParams({
    status: STATUS_URL_VALUES,
    ...ARCHIVED_FILTER,
  });
  const statusParam = view.filters.status;
  /** What the API is asked for: Active unless the URL says otherwise; undefined (both) for "all". */
  const status: DriverStatus | undefined =
    statusParam === "all"
      ? undefined
      : ((statusParam as DriverStatus | undefined) ?? "active");
  const archivedOnly = view.filters.show === "archived";
  const setArchived = useSetDriverArchived();

  const { data, isPending, isError, error, isPlaceholderData } = useDrivers({
    status,
    onboarding: false,
    // Drivers in collections are on the Collections page (D81).
    collections: false,
    archived: archivedOnly || undefined,
    search: view.search || undefined,
    from: view.from,
    to: view.to,
    page: view.page,
    limit: LIST_PAGE_SIZE,
  });

  const columns = makeColumns((driver) => {
    setArchived.reset();
    setArchived.mutate({ id: driver.id, archived: !driver.archivedAt });
  });

  return (
    <div className="space-y-6">
      {setArchived.isError && (
        <p
          role="alert"
          className="rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-600"
        >
          {setArchived.error.message}
        </p>
      )}
      <TableCard
        title="Drivers"
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
              value: statusParam,
            },
            archivedFilterGroup(view.filters.show),
          ],
          onApply: (values) =>
            view.setFilters({ status: values.status, show: values.show }),
        }}
        dateRange={{
          label: "Since",
          value: { from: view.from, to: view.to },
          onChange: view.setDateRange,
        }}
        onClearAll={view.clearAll}
        actions={
          <Button
            size="sm"
            startIcon={<PlusIcon />}
            onClick={() => void navigate("/admin/drivers/new")}
          >
            Add driver
          </Button>
        }
        isPending={isPending}
        error={isError ? error : null}
        isEmpty={data?.items.length === 0}
        emptyText={
          view.search || statusParam || archivedOnly || view.from || view.to
            ? "No drivers match this search or filter."
            : "No drivers yet. Add one, or start onboarding on an approved application."
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
              void navigate(`/admin/drivers/${driver.id}`)
            }
            dimmed={isPlaceholderData}
          />
        )}
      </TableCard>
    </div>
  );
}
