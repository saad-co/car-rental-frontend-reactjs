import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import RequireAuth from "./components/auth/RequireAuth";
import AppLayout from "./layout/AppLayout";
import ApplicationDetail from "./pages/Applications/ApplicationDetail";
import ApplicationsList from "./pages/Applications/ApplicationsList";
import SignIn from "./pages/AuthPages/SignIn";
import Home from "./pages/Dashboard/Home";
import ChangePassword from "./pages/Driver/ChangePassword";
import DriverHome from "./pages/Driver/DriverHome";
import VerifyEmail from "./pages/Driver/VerifyEmail";
import DriversList from "./pages/Drivers/DriversList";

/**
 * Routing table: two areas in one app.
 *
 * - Admin: `/admin/login` (public); everything else under `/admin` needs an admin
 *   (`RequireAuth role="admin"`) and has the sidebar + header (`AppLayout`).
 * - Driver: `/driver/login` and `/driver/verify-email` (public); `/driver` and
 *   `/driver/change-password` need a driver. A driver with a temporary password is held on
 *   the change-password page.
 * - Any other URL goes to `/admin`.
 *
 * Nested routes work like `router.use("/admin", requireAuth, adminRouter)` in Express: the
 * parent runs first and renders its children through `<Outlet />`.
 */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin/login" element={<SignIn role="admin" />} />
        <Route path="/admin" element={<RequireAuth role="admin" />}>
          <Route element={<AppLayout />}>
            <Route index element={<Home />} />
            <Route path="applications" element={<ApplicationsList />} />
            <Route path="applications/:id" element={<ApplicationDetail />} />
            <Route path="drivers" element={<DriversList />} />
          </Route>
        </Route>

        <Route path="/driver/login" element={<SignIn role="driver" />} />
        <Route path="/driver/verify-email" element={<VerifyEmail />} />
        <Route path="/driver" element={<RequireAuth role="driver" />}>
          <Route index element={<DriverHome />} />
          <Route path="change-password" element={<ChangePassword />} />
        </Route>

        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
