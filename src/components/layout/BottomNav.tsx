import { useLocation, useNavigate } from 'react-router-dom';
import { LuHouse, LuPencil, LuClipboardList, LuBookOpen, LuTrendingUp } from 'react-icons/lu';
import type { IconType } from 'react-icons';

interface NavItem {
  path: string;
  label: string;
  icon: IconType;
}

const navItems: NavItem[] = [
  { path: '/', label: 'ホーム', icon: LuHouse },
  { path: '/input', label: '入力', icon: LuPencil },
  { path: '/transactions', label: '記録', icon: LuClipboardList },
  { path: '/knowledge', label: 'ナレッジ', icon: LuBookOpen },
  { path: '/simulator', label: '将来', icon: LuTrendingUp },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white safe-area-bottom z-50"
      style={{ boxShadow: '0 -1px 8px rgba(0,0,0,0.06)' }}>
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center gap-0.5 flex-1 py-2 transition-colors"
            >
              <Icon
                size={22}
                color={isActive ? '#1E3A5F' : '#9CA3AF'}
              />
              <span
                className="text-[10px] font-medium"
                style={{ color: isActive ? '#1E3A5F' : '#9CA3AF' }}
              >
                {item.label}
              </span>
              {isActive && (
                <div className="w-1 h-1 rounded-full" style={{ backgroundColor: '#2E86C1' }} />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
