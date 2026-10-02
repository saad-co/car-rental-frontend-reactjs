import { useState } from 'react'
import { Dropdown } from '../ui/dropdown/Dropdown'

// PLACEHOLDER: static user until login exists. It will show the signed-in user's
// email and role (and a Sign out button) once authentication is wired in.
const placeholderUser = { name: 'Staff User', email: 'staff@example.com' }

export default function UserDropdown() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen((open) => !open)}
        className="flex items-center text-gray-700 dropdown-toggle"
      >
        <span className="flex items-center justify-center mr-3 font-medium rounded-full h-11 w-11 bg-brand-50 text-brand-500">
          {placeholderUser.name.charAt(0)}
        </span>
        <span className="block mr-1 font-medium text-theme-sm">
          {placeholderUser.name}
        </span>
        <svg
          className={`stroke-gray-500 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
          width="18"
          height="20"
          viewBox="0 0 18 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M4.3125 8.65625L9 13.3437L13.6875 8.65625"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        className="absolute right-0 mt-[17px] flex w-[260px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg"
      >
        <span className="block font-medium text-gray-700 text-theme-sm">
          {placeholderUser.name}
        </span>
        <span className="mt-0.5 block text-theme-xs text-gray-500">
          {placeholderUser.email}
        </span>
      </Dropdown>
    </div>
  )
}
