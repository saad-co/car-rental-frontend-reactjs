import { useEffect } from "react";
import { Link, useLocation } from "react-router";
import { DocsIcon, GridIcon, HorizontaLDots } from "../icons";
import { useSidebar } from "../context/SidebarContext";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path: string;
};

// Add a line here when a new screen exists (Drivers, Payments, ...).
const navItems: NavItem[] = [
  { name: "Dashboard", icon: <GridIcon />, path: "/admin" },
  { name: "Applications", icon: <DocsIcon />, path: "/admin/applications" },
];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered, setIsMobileOpen } =
    useSidebar();
  const location = useLocation();

  // On mobile, close the sidebar after navigating to another page.
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname, setIsMobileOpen]);

  // A section stays highlighted on its sub-pages too (e.g. an application's detail page).
  // The dashboard ("/admin") must match exactly, or it would be highlighted everywhere.
  const isActive = (path: string) =>
    path === "/admin"
      ? location.pathname === path
      : location.pathname === path || location.pathname.startsWith(`${path}/`);
  // Show text labels when the sidebar is open (wide, hovered, or open on mobile).
  const showLabels = isExpanded || isHovered || isMobileOpen;

  return (
    <aside
      className={`fixed top-0 left-0 z-50 flex flex-col h-screen px-5 text-gray-900 transition-all duration-300 ease-in-out bg-white border-r border-gray-200
        ${showLabels ? "w-72.5" : "w-22.5"}
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        xl:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`flex py-8 ${
          !isExpanded && !isHovered ? "xl:justify-center" : "justify-start"
        }`}
      >
        {/* Text logo placeholder until the client provides a real one. */}
        <Link to="/admin" className="text-xl font-semibold text-gray-900">
          {showLabels ? "Car Rental" : "CR"}
        </Link>
      </div>

      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <h2
            className={`mb-4 text-xs uppercase flex leading-5 text-gray-400 ${
              !isExpanded && !isHovered ? "xl:justify-center" : "justify-start"
            }`}
          >
            {showLabels ? "Menu" : <HorizontaLDots className="size-6" />}
          </h2>
          <ul className="flex flex-col gap-1">
            {navItems.map((nav) => (
              <li key={nav.name}>
                <Link
                  to={nav.path}
                  className={`menu-item group ${
                    isActive(nav.path)
                      ? "menu-item-active"
                      : "menu-item-inactive"
                  }`}
                >
                  <span
                    className={`menu-item-icon-size ${
                      isActive(nav.path)
                        ? "menu-item-icon-active"
                        : "menu-item-icon-inactive"
                    }`}
                  >
                    {nav.icon}
                  </span>
                  {showLabels && <span>{nav.name}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </aside>
  );
};

export default AppSidebar;
