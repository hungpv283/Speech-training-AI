import { Layout } from 'antd';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  LogOut,
  Menu,
  Trophy,
} from 'lucide-react';

const { Sider } = Layout;

const SidebarUser = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { icon: LayoutDashboard, label: 'Quản lý', path: '/user/profile' },
    { icon: Trophy, label: 'Top Đóng Góp', path: '/user/top-score' },
  ];

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      trigger={null}
      width={256}
      collapsedWidth={80}
      style={{ background: '#fff' }}
    >
      {/* Header */}
      <div className="h-16 px-4 flex items-center border-b border-blue-200">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg"
        >
          <Menu className="w-5 h-5" />
        </button>
        {!collapsed && (
          <span className="ml-3 font-bold text-blue-900">SpeechSwitch</span>
        )}
      </div>

      {/* Menu */}
      <nav className="py-4">
        {menuItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <div key={item.path} className="px-3 mb-2">
              <button
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg ${active
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-blue-600 hover:bg-blue-50'
                  }`}
              >
                <item.icon className="w-5 h-5" />
                {!collapsed && item.label}
              </button>
            </div>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="absolute bottom-0 w-full p-4 border-t">
        <button
          onClick={() => navigate('/recording')}
          className="w-full flex items-center gap-3 text-red-600"
        >
          <LogOut className="w-5 h-5" />
          {!collapsed && 'Đăng xuất'}
        </button>
      </div>
    </Sider>
  );
};

export default SidebarUser;
