// Based on TailAdmin's PaginationWithText (components/ui/pagination/PaginationWithText.tsx).
// Changes: controlled (the page number comes from the parent instead of internal state, so it can
// live in the URL); page links are buttons instead of `<a href="#">`; mobile arrow icons and
// dark-mode classes removed.

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
            ? "text-white bg-brand-500 hover:bg-brand-600"
            : "text-gray-700 hover:bg-brand-500 hover:text-white"
        }`}
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
    <div className="flex items-center justify-between gap-2 px-6 py-4 sm:justify-normal">
      <button
        type="button"
        onClick={() => goTo(currentPage - 1)}
        disabled={currentPage === 1}
        className={arrowButtonClass}
      >
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
      </button>
    </div>
  );
}
