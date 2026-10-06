import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import AppLayout from "./layout/AppLayout";
import Home from "./pages/Dashboard/Home";
import SignIn from "./pages/AuthPages/SignIn";

// Routing table. Pages inside <AppLayout> get the sidebar + header around them.
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Home />} />
        </Route>
        {/* Outside AppLayout: the login page has no sidebar or header. */}
        <Route path="/admin/login" element={<SignIn />} />
        {/* Unknown URL: send the user home. */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
