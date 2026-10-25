import Badge from "./Badge";

/**
 * "Archived" in place of a status badge (D80). Archive is a flag kept next to the status, so an archived row still has
 * its old status; showing only that ("Active") made an archived driver look live in the Archived list. The old status
 * is kept as small text ("was Active"), so the admin sees both what it is now and what Unarchive brings back.
 */
export default function ArchivedBadge({ was }: { was: string }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <Badge size="sm" color="dark">
        Archived
      </Badge>
      <span className="text-theme-xs text-gray-500">was {was}</span>
    </span>
  );
}
