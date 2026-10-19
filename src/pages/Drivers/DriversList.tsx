import BalanceText from "../../components/drivers/BalanceText";
import { Link, useNavigate } from "react-router";
import {
  useDrivers,
  type Driver,
  type DriverStatus,
} from "../../api/drivers.queries";
import DataTable, { type Column } from "../../components/tables/DataTable";
import TableCard from "../../components/tables/TableCard";
import {
  LIST_PAGE_SIZE,
  filterOptions,
  pageCount,
  useListParams,
} from "../../components/tables/useListParams";
import DriverStatusBadge from "../../components/drivers/DriverStatusBadge";
import { DRIVER_STATUS_LABEL } from "../../components/drivers/driverStatus";
import AvatarText from "../../components/ui/avatar/AvatarText";
import { formatDateTime, formatUsPhone } from "../../utils";

const STATUSES = Object.keys(DRIVER_STATUS_LABEL) as DriverStatus[];

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
];

/**
 * Admin list of drivers, newest first, on the shared table components (B75): search (name, email, phone), a
 * Status filter, 8 rows per page; the view lives in the URL. Drivers are created by approving an application.
 */
export default function DriversList() {
  const navigate = useNavigate();
  const view = useListParams({ status: STATUSES });
  const status = view.filters.status as DriverStatus | undefined;

  const { data, isPending, isError, error, isPlaceholderData } = useDrivers({
    status,
    search: view.search || undefined,
    from: view.from,
    to: view.to,
    page: view.page,
    limit: LIST_PAGE_SIZE,
  });

  return (
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
            options: filterOptions(DRIVER_STATUS_LABEL),
            value: status,
          },
        ],
        onApply: (values) => view.setFilters({ status: values.status }),
      }}
      dateRange={{
        label: "Since",
        value: { from: view.from, to: view.to },
        onChange: view.setDateRange,
      }}
      onClearAll={view.clearAll}
      isPending={isPending}
      error={isError ? error : null}
      isEmpty={data?.items.length === 0}
      emptyText={
        view.search || status || view.from || view.to
          ? "No drivers match this search or filter."
          : "No drivers. Drivers are created by approving an application."
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
          onRowClick={(driver) => void navigate(`/admin/drivers/${driver.id}`)}
          dimmed={isPlaceholderData}
        />
      )}
    </TableCard>
  );
}
