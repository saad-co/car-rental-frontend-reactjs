import { useState } from "react";
import { useCollections } from "../../../api/dashboard.queries";
import { LIST_PAGE_SIZE } from "../../tables/useListParams";
import PeriodsTable from "./PeriodsTable";
import type { CollectionView } from "./financialFormat";

/** The monthly and daily views: one table of periods, paged on the server. (The weekly view adds the week selector.) */
export default function PeriodsView({
  view,
}: {
  view: Exclude<CollectionView, "weekly">;
}) {
  const [page, setPage] = useState(1);
  const { data, isPending, error } = useCollections({
    view,
    page,
    limit: LIST_PAGE_SIZE,
  });
  return (
    <PeriodsTable
      view={view}
      data={data}
      isPending={isPending}
      error={error}
      page={page}
      onPageChange={setPage}
    />
  );
}
