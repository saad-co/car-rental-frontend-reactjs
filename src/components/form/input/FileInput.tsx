import type { ChangeEvent, FC } from "react";

// Copied from TailAdmin (components/form/input/FileInput.tsx). Changes: dark-mode classes removed (D20); `id`, `name`,
// `accept`, `disabled` and `ariaLabel` added; a red border for `error`; the picked file's size is not shown (the form
// checks it).

interface FileInputProps {
  id?: string;
  name?: string;
  /** What the browser's file dialog offers, e.g. `image/jpeg,image/png,application/pdf`. */
  accept?: string;
  disabled?: boolean;
  /** Name read by screen readers when there is no visible label. */
  ariaLabel?: string;
  /** Red border: the file is not acceptable. */
  error?: boolean;
  className?: string;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
}

/** A styled file picker (a native `<input type="file">`). */
const FileInput: FC<FileInputProps> = ({
  id,
  name,
  accept,
  disabled = false,
  ariaLabel,
  error = false,
  className = "",
  onChange,
}) => {
  return (
    <input
      id={id}
      name={name}
      type="file"
      accept={accept}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`h-11 w-full overflow-hidden rounded-lg border bg-transparent text-sm text-gray-500 shadow-theme-xs transition-colors file:mr-5 file:border-collapse file:cursor-pointer file:rounded-l-lg file:border-0 file:border-r file:border-solid file:border-gray-200 file:bg-gray-50 file:py-3 file:pl-3.5 file:pr-3 file:text-sm file:text-gray-700 placeholder:text-gray-400 hover:file:bg-gray-100 focus:outline-hidden focus:file:ring-brand-300 disabled:cursor-not-allowed disabled:opacity-40 ${
        error ? "border-error-500" : "border-gray-300 focus:border-brand-300"
      } ${className}`}
      onChange={onChange}
    />
  );
};

export default FileInput;
