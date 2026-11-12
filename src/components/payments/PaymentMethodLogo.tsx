import type { LogoMethod } from "./logoMethod";

/** The name read aloud for each logo. */
const NAME: Record<LogoMethod, string> = {
  zelle: "Zelle",
  cashapp: "Cash App",
  venmo: "Venmo",
  stripe: "Stripe",
};

/**
 * A small payment-method mark: a rounded tile in the brand's colour with its letter or sign. Drawn inline (no image files,
 * no new library), simplified marks rather than the official artwork: swap the drawing here if the client sends the
 * official files. Decorative next to the method's name, which is always still written out.
 */
export default function PaymentMethodLogo({
  method,
  size = 20,
}: {
  method: LogoMethod | null;
  size?: number;
}) {
  if (!method) return null;
  return (
    <svg
      role="img"
      aria-label={`${NAME[method]} logo`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className="inline-block shrink-0 align-text-bottom"
    >
      {method === "zelle" && (
        <>
          <rect width="24" height="24" rx="6" fill="#6D1ED4" />
          <path
            d="M7 7h10v2.2L10.4 15.8H17V18H7v-2.2L13.6 9.2H7z"
            fill="#fff"
          />
          <path d="M11 5.5h2V7h-2zM11 17h2v1.5h-2z" fill="#fff" />
        </>
      )}
      {method === "cashapp" && (
        <>
          <rect width="24" height="24" rx="6" fill="#00D632" />
          <path
            d="M13.1 5h-2.2v1.3c-1.5.2-2.6 1.2-2.6 2.7 0 1.7 1.3 2.3 2.9 2.7 1.1.3 1.6.5 1.6 1 0 .5-.5.8-1.3.8-.9 0-1.5-.4-1.6-1.2H8.2c.1 1.4 1 2.3 2.7 2.5V18h2.2v-1.3c1.7-.2 2.7-1.2 2.7-2.6 0-1.7-1.3-2.3-3-2.7-1-.3-1.5-.5-1.5-1 0-.4.4-.7 1.1-.7.8 0 1.3.3 1.4 1h2.1c-.1-1.3-1-2.2-2.5-2.4z"
            fill="#fff"
          />
        </>
      )}
      {method === "stripe" && (
        <>
          <rect width="24" height="24" rx="6" fill="#635BFF" />
          <path
            d="M11.2 9.3c0-.5.4-.7 1.1-.7.9 0 2 .3 2.9.8V6.8a7.6 7.6 0 0 0-2.9-.5c-2.4 0-4 1.2-4 3.3 0 3.2 4.4 2.7 4.4 4.100 0 .6-.5.8-1.300.8-1.100 0-2.500-.5-3.600-1.100v2.600c1.200.5 2.400.8 3.600.8 2.400 0 4.100-1.200 4.100-3.300 0-3.500-4.300-2.900-4.300-4.200z"
            fill="#fff"
          />
        </>
      )}
      {method === "venmo" && (
        <>
          <rect width="24" height="24" rx="6" fill="#3D95CE" />
          <path
            d="M16.8 6c.4.7.6 1.4.6 2.3 0 2.9-2.5 6.6-4.5 9.2h-4.6L6.5 6.6l4-.4.9 7.1c.8-1.3 1.8-3.4 1.8-4.8 0-.8-.1-1.3-.4-1.8z"
            fill="#fff"
          />
        </>
      )}
    </svg>
  );
}
