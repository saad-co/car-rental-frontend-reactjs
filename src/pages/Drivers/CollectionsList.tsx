import { Link, useNavigate } from "react-router";
import {
  useDrivers,
  useRemoveFromCollections,
  useSetDriverArchived,
  type Driver,
} from "../../api/drivers.queries";
import BalanceText from "../../components/drivers/BalanceText";
import { leftReasonText } from "../../components/drivers/driverStatus";
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
import { formatDateTime, formatUsPhone } from "../../utils";

/** The table's columns; each row's "⋯" menu removes the driver from collections or archives them. */
const makeColumns = (
  onRemove: (driver: Driver) => void,
  onArchive: (driver: Driver) => void,
): Column<Driver>[] => [
  {
    key: "driver",
    header: "Driver",
    render: (driver) => {
      const name = `${driver.firstName} ${driver.lastName}`;
      return (
        <div className="flex items-center gap-3">
          <AvatarText name={name} />
          <div className="min-w-0">
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
    key: "left",
    header: "How they left",
    render: (driver) => (
      <div>
        <span className="block text-gray-800">
          {leftReasonText(driver.leftReason)}
        </span>
        {driver.leftAt && (
          <span className="block text-theme-xs text-gray-500">
            {formatDateTime(driver.leftAt)}
          </span>
        )}
      </div>
    ),
  },
  {
    key: "sent",
    header: "Sent to collections",
    className: "whitespace-nowrap",
    render: (driver) => formatDateTime(driver.sentToCollectionsAt),
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
          // The driver page holds the text-message chat, where the client writes about the balance.
          { label: "Message driver", to: `/admin/drivers/${driver.id}` },
          { label: "View ledger", to: `/admin/drivers/${driver.id}/ledger` },
          {
            label: "Remove from collections",
            onClick: () => onRemove(driver),
          },
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
 * Admin list of drivers sent to collections (D81), the latest first, on the shared table components: search (name, email,
 * phone), a "Sent" date range, a Show filter for archived ones, 8 rows per page; the view lives in the URL. The balance
 * is the ledger's, as on the Drivers list, so a driver who paid shows "Settled" and can be removed. The client messages
 * the driver from the driver page; passing the account to an outside agency is not built.
 */
export default function CollectionsList() {
  const navigate = useNavigate();
  const view = useListParams({ ...ARCHIVED_FILTER });
  const archivedOnly = view.filters.show === "archived";
  const remove = useRemoveFromCollections();
  const setArchived = useSetDriverArchived();

  const { data, isPending, isError, error, isPlaceholderData } = useDrivers({
    collections: true,
    archived: archivedOnly || undefined,
    search: view.search || undefined,
    from: view.from,
    to: view.to,
    page: view.page,
    limit: LIST_PAGE_SIZE,
  });

  const columns = makeColumns(
    (driver) => {
      setArchived.reset();
      remove.mutate(driver.id);
    },
    (driver) => {
      remove.reset();
      setArchived.mutate({ id: driver.id, archived: !driver.archivedAt });
    },
  );
  const actionError = remove.error ?? setArchived.error;

  return (
    <div className="space-y-6">
      {actionError && (
        <p
          role="alert"
          className="rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-600"
        >
          {actionError.message}
        </p>
      )}
      <TableCard
        title="Collections"
        search={{
          value: view.search,
          onSearch: view.setSearch,
          placeholder: "Search name, email, phone...",
        }}
        filters={{
          groups: [archivedFilterGroup(view.filters.show)],
          onApply: (values) => view.setFilters({ show: values.show }),
        }}
        dateRange={{
          label: "Sent",
          value: { from: view.from, to: view.to },
          onChange: view.setDateRange,
        }}
        onClearAll={view.clearAll}
        isPending={isPending}
        error={isError ? error : null}
        isEmpty={data?.items.length === 0}
        emptyText={
          view.search || archivedOnly || view.from || view.to
            ? "No drivers match this search or filter."
            : "No drivers in collections. Send a driver who left owing money from their page."
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
