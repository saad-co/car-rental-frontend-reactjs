/** A white card with a title, the same look as the driver page (shared by the contract page's cards). */
export default function ContractCard({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6">
      <h2 className="text-base font-semibold text-gray-800">{title}</h2>
      {note && <p className="mt-1 text-sm text-gray-500">{note}</p>}
      <div className="mt-4">{children}</div>
    </div>
  );
}
