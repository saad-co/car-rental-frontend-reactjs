// PLACEHOLDER dashboard so the app shell has something to render.
// The real dashboard (spec section 10) comes in a later milestone.
export default function Home() {
  return (
    <div className="p-6 bg-white border border-gray-200 rounded-2xl">
      <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
      <p className="mt-1 text-gray-500 text-theme-sm">
        Placeholder page. The app shell (sidebar, header, theme) is working.
      </p>
    </div>
  );
}
