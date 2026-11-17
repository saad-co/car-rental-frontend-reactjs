/**
 * Hands a downloaded file to the browser so it saves it under `fileName`. The admin token travels in a request header, so a plain
 * link cannot fetch these files: the page fetches the bytes, then this saves them. The temporary address is released at once.
 */
export function saveBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
