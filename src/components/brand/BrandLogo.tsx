import logoUrl from "../../assets/gonzocar-logo.svg";
import markUrl from "../../assets/gonzocar-mark.svg";
import { BRAND_NAME } from "../../brand";
import { cn } from "../../utils";

/**
 * The compact logo for the collapsed sidebar, where the wordmark does not fit: the "G" and the purple "C" of the client's
 * logo (the same letter shapes, from the same PDF), on the same light plate.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-lg bg-[#f7f7f7] px-2 py-2",
        className,
      )}
    >
      <img src={markUrl} alt={BRAND_NAME} className="block h-5 w-auto" />
    </span>
  );
}

/**
 * The client's GonzoCar logo (from `logo(pdf).pdf`, redrawn as an SVG so it stays sharp at any size). The wordmark is navy
 * and purple, so it sits on a light rounded plate: the app is dark, and navy letters would vanish on it.
 */
export default function BrandLogo({
  className,
  height = 28,
}: {
  className?: string;
  /** Height of the wordmark in pixels; the plate adds padding around it. */
  height?: number;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-lg bg-[#f7f7f7] px-3 py-2",
        className,
      )}
    >
      <img
        src={logoUrl}
        alt={`${BRAND_NAME}: Rent. Drive. Earn.`}
        style={{ height }}
        className="block w-auto"
      />
    </span>
  );
}
