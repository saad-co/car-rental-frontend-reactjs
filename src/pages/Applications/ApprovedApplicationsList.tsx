import { Link, useNavigate } from "react-router";
import {
  useApprovedApplications,
  useArchiveApplication,
  useStartOnboarding,
  useUnarchiveApplication,
  type ApprovedApplicationItem,
} from "../../api/applications.queries";
import DriverStatusBadge from "../../components/drivers/DriverStatusBadge";
import DataTable, { type Column } from "../../components/tables/DataTable";
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
import ArchivedBadge from "../../components/ui/badge/ArchivedBadge";
import Badge from "../../components/ui/badge/Badge";
import Button from "../../components/ui/button/Button";
import { formatDateTime, formatUsPhone } from "../../utils";

/**
 * Approved applications (D80): applicants who were approved but whose onboarding is not finished. Approving creates no
 * driver, because many approved applicants never pick up a car. Here the admin presses "Start onboarding" when an
 * applicant wants to go ahead (that creates the driver, who then does the contract, deposit and vehicle on their own
 * page); once all three steps are done the driver is active and moves from here to the Drivers page.
 *
 * Built like the other lists: search, "Received" days, 8 rows per page, the view in the URL. The Show filter lists the
 * archived ones; Archive and Unarchive on a row act on the application and on its onboarding driver together.
 */
export default function ApprovedApplicationsList() {
  const navigate = useNavigate();
  const view = useListParams({ ...ARCHIVED_FILTER });
  const archivedOnly = view.filters.show === "archived";

  const { data, isPending, isError, error, isPlaceholderData } =
    useApprovedApplications({
      archived: archivedOnly || undefined,
      search: view.search || undefined,
      from: view.from,
      to: view.to,
      page: view.page,
      limit: LIST_PAGE_SIZE,
    });

  const startOnboarding = useStartOnboarding();
  const archive = useArchiveApplication();
  const unarchive = useUnarchiveApplication();
  const busy =
    startOnboarding.isPending || archive.isPending || unarchive.isPending;
  /** Why the last action was refused (e.g. a driver with this email already exists), shown above the table. */
  const actionError = startOnboarding.error ?? archive.error ?? unarchive.error;
  const resetActions = () => {
    startOnboarding.reset();
    archive.reset();
    unarchive.reset();
  };

  const columns: Column<ApprovedApplicationItem>[] = [
    {
      key: "applicant",
      header: "Applicant",
      render: (application) => {
        const name = `${application.firstName} ${application.lastName}`;
        return (
          <div className="flex items-center gap-3">
            <AvatarText name={name} />
            <div className="min-w-0">
              <Link
                to={
                  application.driver
                    ? `/admin/drivers/${application.driver.id}`
                    : `/admin/applications/${application.id}`
                }
                onClick={(event) => event.stopPropagation()}
                className="block font-medium text-gray-800 hover:text-brand-500"
              >
                {name}
              </Link>
              <span className="block text-gray-500">{application.email}</span>
            </div>
          </div>
        );
      },
    },
    {
      key: "phone",
      header: "Phone",
      className: "whitespace-nowrap",
      render: (a) =>
        formatUsPhone(`+1${a.phone.replace(/\D/g, "").slice(-10)}`),
    },
    {
      key: "onboarding",
      header: "Onboarding",
      render: (application) =>
        application.driver ? (
          <DriverStatusBadge
            driver={{
              status: application.driver.status,
              // The application is archived together with its onboarding driver (D80).
              archivedAt: application.archivedAt,
              onboarding: {
                contractSignedAt: application.driver.contractSignedAt,
                depositPaidAt: application.driver.depositPaidAt,
                vehicleAssignedAt: application.driver.vehicleAssignedAt,
              },
            }}
          />
        ) : application.archivedAt ? (
          <ArchivedBadge was="Not started" />
        ) : (
          <Badge size="sm" color="light">
            Not started
          </Badge>
        ),
    },
    {
      key: "received",
      header: "Received",
      render: (a) => formatDateTime(a.receivedAt),
    },
    {
      key: "action",
      header: "Action",
      align: "end",
      className: "w-px",
      render: (application) => (
        <div
          // A click on a button here must not also open the row.
          onClick={(event) => event.stopPropagation()}
          className="flex items-center justify-end gap-4 whitespace-nowrap"
        >
          {application.driver ? (
            <Link
              to={`/admin/drivers/${application.driver.id}`}
              onClick={(event) => event.stopPropagation()}
              className="text-sm text-brand-500"
            >
              View details
            </Link>
          ) : (
            !application.archivedAt && (
              <Button
                size="sm"
                disabled={busy}
                onClick={() => {
                  resetActions();
                  startOnboarding.mutate(application.id, {
                    onSuccess: (started) =>
                      void navigate(`/admin/drivers/${started.driverId}`),
                  });
                }}
              >
                Start onboarding
              </Button>
            )
          )}
          <button
            type="button"
            aria-label={`${application.archivedAt ? "Unarchive" : "Archive"} ${application.firstName} ${application.lastName}`}
            disabled={busy}
            onClick={(event) => {
              event.stopPropagation();
              resetActions();
              (application.archivedAt ? unarchive : archive).mutate(
                application.id,
              );
            }}
            className="text-sm text-gray-700 hover:text-brand-500 disabled:opacity-50"
          >
            {application.archivedAt ? "Unarchive" : "Archive"}
          </button>
        </div>
      ),
    },
  ];

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
        title="Approved applications"
        search={{
          value: view.search,
          onSearch: view.setSearch,
          placeholder: "Search name, email, phone, city...",
        }}
        filters={{
          groups: [archivedFilterGroup(view.filters.show)],
          onApply: (values) => view.setFilters({ show: values.show }),
        }}
        dateRange={{
          label: "Received",
          value: { from: view.from, to: view.to },
          onChange: view.setDateRange,
        }}
        onClearAll={view.clearAll}
        isPending={isPending}
        error={isError ? error : null}
        isEmpty={data?.items.length === 0}
        emptyText={
          view.search || archivedOnly || view.from || view.to
            ? "No approved applications match this search or filter."
            : "No approved applications waiting. Approve one from the Applications page."
        }
        page={view.page}
        totalPages={data ? pageCount(data.total) : 1}
        onPageChange={view.setPage}
      >
        {data && (
          <DataTable
            columns={columns}
            rows={data.items}
            rowKey={(a) => a.id}
            onRowClick={(a) =>
              void navigate(
                a.driver
                  ? `/admin/drivers/${a.driver.id}`
                  : `/admin/applications/${a.id}`,
              )
            }
            dimmed={isPlaceholderData}
          />
        )}
      </TableCard>
    </div>
  );
}
