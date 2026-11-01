import { useId } from "react";

// Copied from TailAdmin (components/ui/spinner/SpinnerOne.tsx), its first (20 px) spinner. Changes: dark-mode classes
// removed (D20); one spinner instead of the demo row; the mask id made unique with `useId`, so two on a page never clash.

/** TailAdmin's spinning ring in the brand colour. Decorative: say what is loading in text next to it. */
export default function Spinner() {
  const maskId = useId();
  return (
    <div
      aria-hidden="true"
      className="animate-spin stroke-brand-500 text-gray-200"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="10" cy="10" r="8.5" stroke="currentColor" strokeWidth="3" />
        <mask id={maskId} fill="white">
          <path d="M18.5172 10C19.3361 10 20.0113 9.33252 19.8903 8.52257C19.6474 6.89692 19.0062 5.34812 18.014 4.01868C16.7246 2.29109 14.9114 1.02642 12.8448 0.413166C10.7781 -0.200084 8.5686 -0.129079 6.54558 0.615599C4.9888 1.18865 3.60659 2.13704 2.51635 3.36711C1.97316 3.97997 2.17495 4.90767 2.86134 5.35436C3.54773 5.80104 4.45707 5.59214 5.03749 5.01442C5.75143 4.3038 6.61392 3.7506 7.57003 3.39866C8.9931 2.87482 10.5473 2.82488 12.0011 3.25626C13.4549 3.68764 14.7303 4.57726 15.6373 5.79251C16.2467 6.609 16.6679 7.5431 16.8787 8.52811C17.05 9.32892 17.6983 10 18.5172 10Z" />
        </mask>
        <path
          d="M18.5172 10C19.3361 10 20.0113 9.33252 19.8903 8.52257C19.6474 6.89692 19.0062 5.34812 18.014 4.01868C16.7246 2.29109 14.9114 1.02642 12.8448 0.413166C10.7781 -0.200084 8.5686 -0.129079 6.54558 0.615599C4.9888 1.18865 3.60659 2.13704 2.51635 3.36711C1.97316 3.97997 2.17495 4.90767 2.86134 5.35436C3.54773 5.80104 4.45707 5.59214 5.03749 5.01442C5.75143 4.3038 6.61392 3.7506 7.57003 3.39866C8.9931 2.87482 10.5473 2.82488 12.0011 3.25626C13.4549 3.68764 14.7303 4.57726 15.6373 5.79251C16.2467 6.609 16.6679 7.5431 16.8787 8.52811C17.05 9.32892 17.6983 10 18.5172 10Z"
          stroke="currentStroke"
          strokeWidth="8"
          mask={`url(#${maskId})`}
        />
      </svg>
    </div>
  );
}
