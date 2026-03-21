import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Mic,
  LogOut,
  Menu,
  FileText,
  type LucideIcon,
} from 'lucide-react';

type MenuItem = {
  icon: LucideIcon;
  label: string;
  path: string;
  children?: MenuItem[];
};

const SidebarManager = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const userRole = localStorage.getItem('userRole') || 'Admin';

  const menuItems: MenuItem[] = userRole === 'Manager'
    ? [
      { icon: LayoutDashboard, label: 'Tổng Quan', path: '/manager/dashboard' },
      { icon: Mic, label: 'Quản lý ghi âm', path: '/manager/recording' },
      { icon: FileText, label: 'Quản lý câu', path: '/manager/sentences' },
      { icon: Users, label: 'Người dùng', path: '/manager/users' },
    ]
    : [
      { icon: LayoutDashboard, label: 'Tổng Quan', path: '/admin/dashboard' },
      { icon: Mic, label: 'Quản lý ghi âm', path: '/admin/recording' },
      { icon: FileText, label: 'Quản lý câu', path: '/admin/sentences' },
      { icon: Users, label: 'QL Tình nguyện viên', path: '/admin/users' },
    ];

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <aside
      className={`h-screen sticky top-0 shrink-0 bg-white shadow-lg transition-all duration-300 ${collapsed ? 'w-20' : 'w-64'
        }`}
    >
      {/* Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-blue-200">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 rounded-lg text-blue-600 hover:bg-blue-100 hover:text-blue-900 transition-all duration-200"
            aria-label="Toggle sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
          {!collapsed && (
            <span className="text-lg font-bold tracking-wide text-blue-900">SpeechSwitch</span>
          )}
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="py-6 px-2 space-y-2">
        {menuItems.map((item) => {
          const active = isActive(item.path);

          return (
            <div key={item.path} className="relative px-2">
              <button
                onClick={() => {
                  navigate(item.path);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${active
                  ? 'bg-blue-50 text-blue-600 shadow-sm border border-blue-100'
                  : 'text-blue-600 hover:bg-blue-50 hover:text-blue-900'
                  }`}
              >
                <item.icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-blue-600' : 'text-blue-400'}`} />
                {!collapsed && (
                  <span className="text-sm font-semibold">{item.label}</span>
                )}
              </button>
            </div>
          );
        })}
      </nav>

      {/* Logout Button */}
      <div className="absolute bottom-0 left-0 right-0 border-t border-blue-200 p-4 bg-white">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50 transition-all duration-200"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="text-sm font-semibold">Đăng xuất</span>}
        </button>
      </div>
    </aside>
  );
};

export default SidebarManager;
