import { ReactNode } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useAuth } from '@/lib/auth'
import { Dropdown, DropdownItem } from '@/components/ui'
import Sidebar from './Sidebar'
import {
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline'

interface AppLayoutProps {
  children: ReactNode
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate({ to: '/login', search: {} } as any)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="lg:pl-64">
        {/* Top navigation bar */}
        <div className="sticky top-0 z-10 bg-white shadow-sm border-b border-gray-200">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <Link to="/" className="text-xl font-bold text-primary-600 lg:hidden">
                  MiniSentry
                </Link>
                <Link to="/" className="hidden lg:block text-xl font-bold text-primary-600">
                  MiniSentry
                </Link>
              </div>
              
              <div className="flex items-center space-x-4">
                {/* User menu */}
                <Dropdown
                  align="right"
                  trigger={
                    <button className="flex items-center space-x-2 text-sm text-gray-700 hover:text-gray-900 transition-colors">
                      <UserCircleIcon className="h-6 w-6 text-gray-400" />
                      <span className="hidden sm:block">{user?.name}</span>
                      <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                    </button>
                  }
                >
                  <DropdownItem onClick={() => navigate({ to: '/' } as any)}>
                    <UserCircleIcon className="h-4 w-4 mr-2" />
                    Profile
                  </DropdownItem>
                  <DropdownItem onClick={() => navigate({ to: '/' } as any)}>
                    <Cog6ToothIcon className="h-4 w-4 mr-2" />
                    Settings
                  </DropdownItem>
                  <div className="border-t border-gray-100 my-1" />
                  <DropdownItem onClick={handleLogout}>
                    <ArrowRightOnRectangleIcon className="h-4 w-4 mr-2" />
                    Logout
                  </DropdownItem>
                </Dropdown>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
      </div>
    </div>
  )
}

export default AppLayout