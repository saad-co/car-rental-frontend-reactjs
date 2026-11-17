import type { ReactNode } from "react";
import BrandLogo from "../../components/brand/BrandLogo";

/** The frame of every screen of the photo page: a narrow column made for a phone, with the logo on top. No admin menu. */
export default function InspectionLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-5 px-4 py-5">
        <div className="flex justify-center">
          <BrandLogo height={24} />
        </div>
        {children}
      </div>
    </div>
  );
}
