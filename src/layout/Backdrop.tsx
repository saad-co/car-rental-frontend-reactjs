import { useSidebar } from '../context/SidebarContext'

// Dark overlay behind the sidebar on mobile; clicking it closes the sidebar.
const Backdrop: React.FC = () => {
  const { isMobileOpen, toggleMobileSidebar } = useSidebar()

  if (!isMobileOpen) return null

  return (
    <div
      className="fixed inset-0 z-40 bg-gray-900/50 xl:hidden"
      onClick={toggleMobileSidebar}
    />
  )
}

export default Backdrop
