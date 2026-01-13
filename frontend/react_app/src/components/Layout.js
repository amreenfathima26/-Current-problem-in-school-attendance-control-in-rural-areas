import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Home,
  Users,
  Calendar,
  FileText,
  User,
  Menu,
  X,
  LogOut,
  Bell,
  Settings,
  Camera,
  Sun,
  Moon,
} from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { useTheme } from '../contexts/ThemeContext';

const Layout = () => {
  const { user, logout, isAdmin, isTeacher } = useAuth();
  const { settings } = useSettings();
  const { theme, toggleTheme } = useTheme();
  console.log('Layout Rendered. Theme:', theme);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home, roles: ['admin', 'teacher'] },
    { name: 'Attendance', href: '/attendance', icon: Calendar, roles: ['admin', 'teacher'] },
    { name: 'Face Recognition', href: '/face-recognition', icon: Camera, roles: ['admin', 'teacher'] },
    { name: 'Students', href: '/students', icon: Users, roles: ['admin', 'teacher'] },
    { name: 'Reports', href: '/reports', icon: FileText, roles: ['admin', 'teacher'] },
    { name: 'Profile', href: '/profile', icon: User, roles: ['admin', 'teacher', 'student'] },
  ];

  if (isAdmin) {
    navigation.splice(1, 0, { name: 'User Management', href: '/users', icon: Users, roles: ['admin'] });
    navigation.push({ name: 'Settings', href: '/settings', icon: Settings, roles: ['admin'] });
  }

  const filteredNavigation = navigation.filter(item =>
    item.roles.includes(user?.role)
  );

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen flex bg-transparent">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-40 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600/75 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
        <div className="relative flex-1 flex flex-col max-w-xs w-full glass-panel h-full border-r-0 rounded-none">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              type="button"
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white bg-white/20 backdrop-blur-md"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-6 w-6 text-white" />
            </button>
          </div>
          <div className="flex-1 h-0 pt-6 pb-4 overflow-y-auto">
            <div className="flex-shrink-0 flex items-center px-6 gap-3">
              {settings?.logo && <img src={settings.logo} alt="Logo" className="h-8 w-8 object-cover rounded-full" />}
              <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-400">
                {settings?.site_name || 'EDURFID'}
              </h1>
            </div>
            <nav className="mt-8 px-3 space-y-2">
              {filteredNavigation.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`${isActive
                      ? 'bg-blue-50/80 text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:bg-gray-50/50 hover:text-gray-900'
                      } group flex items-center px-3 py-3 text-base font-medium rounded-xl transition-all duration-200 ease-in-out`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <Icon className={`mr-4 h-5 w-5 ${isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500'}`} />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex-shrink-0 flex border-t border-gray-100 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md text-white font-bold">
                  {user?.first_name?.charAt(0) || user?.username?.charAt(0) || 'U'}
                </div>
              </div>
              <div className="ml-3">
                <p className="text-base font-semibold text-gray-800">{user?.get_full_name || user?.username}</p>
                <p className="text-sm font-medium text-gray-500 capitalize">{user?.role}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <div className="flex flex-col w-72">
          <div className="flex flex-col min-h-screen glass-panel border-y-0 border-l-0 rounded-none">
            <div className="flex-1 flex flex-col pt-6 pb-4 overflow-y-auto">
              <div className="flex items-center flex-shrink-0 px-6 gap-3">
                {settings?.logo && <img src={settings.logo} alt="Logo" className="h-10 w-10 object-cover rounded-full shadow-sm" />}
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 tracking-tight">
                  {settings?.site_name || 'EDURFID'}
                </h1>
              </div>
              <nav className="mt-8 flex-1 px-4 space-y-2">
                {filteredNavigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`${isActive
                        ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100'
                        : 'text-gray-600 hover:bg-gray-50/80 hover:text-gray-900 hover:shadow-sm hover:translate-x-1'
                        } group flex items-center px-3 py-3 text-sm font-medium rounded-xl transition-all duration-300 ease-in-out`}
                    >
                      <Icon className={`mr-3 h-5 w-5 ${isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-blue-500 transition-colors'}`} />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </div>
            <div className="flex-shrink-0 flex border-t border-gray-100/50 p-4 bg-white/30 backdrop-blur-sm">
              <div className="flex items-center w-full">
                <div className="flex-shrink-0">
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg ring-2 ring-white">
                    <span className="text-sm font-bold text-white">
                      {user?.first_name?.charAt(0) || user?.username?.charAt(0) || 'U'}
                    </span>
                  </div>
                </div>
                <div className="ml-3 flex-1 overflow-hidden">
                  <p className="text-sm font-bold text-gray-800 truncate">{user?.get_full_name || user?.username}</p>
                  <p className="text-xs font-medium text-gray-500 capitalize truncate">{user?.role}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="ml-2 p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all duration-200"
                  title="Logout"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top bar */}
        <div className="relative z-10 flex-shrink-0 flex h-16 glass-panel rounded-none border-x-0 border-t-0 shadow-sm m-0">
          <button
            type="button"
            className="px-4 border-r border-gray-200/50 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex-1 px-4 flex justify-between">
            <div className="flex-1 flex items-center">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                {settings?.site_caption || 'School Sync'}
              </h2>
            </div>
            <div className="ml-4 flex items-center md:ml-6 space-x-4">
              <div className="text-sm text-gray-500 dark:text-gray-400 hidden md:block">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </div>

              <button
                type="button"
                onClick={toggleTheme}
                className="bg-white/50 dark:bg-gray-700/50 p-2 rounded-full text-gray-400 dark:text-gray-300 hover:text-yellow-500 dark:hover:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/30 focus:outline-none transition-all duration-300"
              >
                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>

              <button
                type="button"
                className="bg-white/50 dark:bg-gray-700/50 p-2 rounded-full text-gray-400 dark:text-gray-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 focus:outline-none transition-all duration-300"
              >
                <Bell className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6 scroll-smooth">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};


export default Layout;
