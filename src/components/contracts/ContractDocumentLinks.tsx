import {
  useContractDocuments,
  type ContractDraft,
} from "../../api/contracts.queries";
import { FILE_LINK_BUTTON } from "./contractStatus";

/**
 * "Open signed contract" (and, when asked, "Certificate") for a signed contract whose files are saved. The links come from
 * the API a moment before they are shown and open in a new tab. Renders nothing when there is nothing to open yet.
 */
export default function ContractDocumentLinks({
  contract,
  withCertificate = true,
}: {
  contract: Pick<ContractDraft, "id" | "status" | "documentsSaved">;
  withCertificate?: boolean;
}) {
  const saved = contract.status === "signed" && contract.documentsSaved;
  const documents = useContractDocuments(contract.id, saved);
  if (!saved) return null;
  if (documents.isError) {
    return (
      <p role="alert" className="text-sm text-error-600">
        {documents.error.message}
      </p>
    );
  }
  const links = documents.data;
  if (!links?.signedPdfUrl) {
    return <span className="text-sm text-gray-500">Loading the links...</span>;
  }
  return (
    <div className="flex flex-wrap items-center gap-3">
      <a
        href={links.signedPdfUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={FILE_LINK_BUTTON}
      >
        Open signed contract
      </a>
      {withCertificate && links.certificateUrl && (
        <a
          href={links.certificateUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={FILE_LINK_BUTTON}
        >
          Certificate
        </a>
      )}
    </div>
  );
}
