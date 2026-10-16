// Based on TailAdmin's PaginationWithText (components/ui/pagination/PaginationWithText.tsx).
// Changes: controlled (the page number comes from the parent instead of internal state, so it can
// live in the URL); page links are buttons instead of `<a href="#">`; mobile arrow icons and
// dark-mode classes removed; laid out like TailAdmin's "Basic Table 5" (Previous far left, numbers
// centred, Next far right, arrows in the buttons, B75).

interface PaginationProps {
  /** The page being shown, starting at 1. */
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

/** Previous / page numbers / Next. Long ranges are shortened with "...". */
export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) {
  const goTo = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    onPageChange(page);
  };

  const renderPageButton = (page: number) => (
    <li key={page}>
      <button
        type="button"
        onClick={() => goTo(page)}
        className={`flex items-center justify-center w-10 h-10 text-sm font-medium rounded-lg ${
          currentPage === page
            ? "bg-brand-500/[0.08] text-brand-500"
            : "text-gray-700 hover:bg-brand-500/[0.08] hover:text-brand-500"
        }`}
        aria-current={currentPage === page ? "page" : undefined}
      >
        {page}
      </button>
    </li>
  );

  const renderEllipsis = (key: string) => (
    <li key={key}>
      <span className="flex items-center justify-center w-10 h-10 text-sm font-medium text-gray-700">
        ...
      </span>
    </li>
  );

  const renderPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 7;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(renderPageButton(i));
      }
    } else {
      pageNumbers.push(renderPageButton(1));
      if (currentPage > 3) pageNumbers.push(renderEllipsis("start"));

      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);
      if (currentPage <= 3) end = 5;
      if (currentPage >= totalPages - 2) start = totalPages - 4;

      for (let i = start; i <= end; i++) {
        pageNumbers.push(renderPageButton(i));
      }

      if (currentPage < totalPages - 2) pageNumbers.push(renderEllipsis("end"));
      pageNumbers.push(renderPageButton(totalPages));
    }

    return pageNumbers;
  };

  const arrowButtonClass =
    "flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="flex items-center justify-between gap-2 px-6 py-4">
      <button
        type="button"
        onClick={() => goTo(currentPage - 1)}
        disabled={currentPage === 1}
        className={arrowButtonClass}
      >
        <ArrowIcon direction="left" />
        Previous
      </button>

      <span className="block text-sm font-medium text-gray-700 sm:hidden">
        Page {currentPage} of {totalPages}
      </span>

      <ul className="hidden items-center gap-0.5 sm:flex">
        {renderPageNumbers()}
      </ul>

      <button
        type="button"
        onClick={() => goTo(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={arrowButtonClass}
      >
        Next
        <ArrowIcon direction="right" />
      </button>
    </div>
  );
}

/** The arrow in the Previous / Next buttons (TailAdmin's pagination arrow). */
function ArrowIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      className={`fill-current ${direction === "right" ? "rotate-180" : ""}`}
      width="20"
      height="20"
      viewBox="0 0 20 20"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M2.58301 9.99868C2.58272 10.1909 2.65588 10.3833 2.80249 10.53L7.79915 15.5301C8.09194 15.8231 8.56682 15.8233 8.85981 15.5305C9.15281 15.2377 9.15297 14.7629 8.86018 14.4699L5.14009 10.7472L16.6675 10.7472C17.0817 10.7472 17.4175 10.4114 17.4175 9.99715C17.4175 9.58294 17.0817 9.24715 16.6675 9.24715L5.14554 9.24715L8.86017 5.53016C9.15297 5.23717 9.15282 4.7623 8.85983 4.4695C8.56684 4.1767 8.09197 4.17685 7.79917 4.46984L2.84167 9.43049C2.68321 9.568 2.58301 9.77087 2.58301 9.99715C2.58301 9.99766 2.58301 9.99817 2.58301 9.99868Z"
      />
    </svg>
  );
}
