import { useLocation, useNavigate } from 'react-router-dom';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

const navItems: NavItem[] = [
  { path: '/', label: 'ホーム', icon: '🏠' },
  { path: '/input', label: '入力', icon: '✏️' },
  { path: '/transactions', label: '記録', icon: '📋' },
  { path: '/knowledge', label: '管理', icon: '⚙️' },
  { path: '/simulator', label: '将来', icon: '📈' },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 safe-area-bottom z-50">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`nav-item flex-1 py-2 ${isActive ? 'active' : ''}`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className={`text-[10px] font-medium ${isActive ? 'text-primary-600' : 'text-slate-400'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
