import type { ReactNode } from "react";

// Copied from TailAdmin (components/ui/table/index.tsx): thin wrappers around the HTML table
// elements so every table in the app is written the same way. Styling is passed in by the page.

interface TableProps {
  children: ReactNode;
  className?: string;
}

interface TableHeaderProps {
  children: ReactNode;
  className?: string;
}

interface TableBodyProps {
  children: ReactNode;
  className?: string;
}

interface TableRowProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

interface TableCellProps {
  children: ReactNode;
  /** Renders a `<th>` instead of a `<td>`. */
  isHeader?: boolean;
  className?: string;
}

const Table: React.FC<TableProps> = ({ children, className }) => {
  return <table className={`min-w-full  ${className}`}>{children}</table>;
};

const TableHeader: React.FC<TableHeaderProps> = ({ children, className }) => {
  return <thead className={className}>{children}</thead>;
};

const TableBody: React.FC<TableBodyProps> = ({ children, className }) => {
  return <tbody className={className}>{children}</tbody>;
};

/** `onClick` added to the TailAdmin version, for rows that open a detail page. */
const TableRow: React.FC<TableRowProps> = ({
  children,
  className,
  onClick,
}) => {
  return (
    <tr className={className} onClick={onClick}>
      {children}
    </tr>
  );
};

const TableCell: React.FC<TableCellProps> = ({
  children,
  isHeader = false,
  className,
}) => {
  const CellTag = isHeader ? "th" : "td";
  return <CellTag className={` ${className}`}>{children}</CellTag>;
};

export { Table, TableHeader, TableBody, TableRow, TableCell };
