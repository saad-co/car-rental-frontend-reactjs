import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import RequireAuth from "./components/auth/RequireAuth";
import AppLayout from "./layout/AppLayout";
import Home from "./pages/Dashboard/Home";
import SignIn from "./pages/AuthPages/SignIn";

/**
 * Routing table.
 *
 * - `/admin/login` is public and has no sidebar or header.
 * - Everything else under `/admin` goes through `RequireAuth` (logged-in only), then `AppLayout`
 *   (sidebar + header). Nested routes work like `router.use("/admin", requireAuth, adminRouter)`
 *   in Express: the parent runs first and renders its children through `<Outlet />`.
 * - Any other URL, including `/`, goes to `/admin`.
 */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin/login" element={<SignIn />} />
        <Route path="/admin" element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route index element={<Home />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
