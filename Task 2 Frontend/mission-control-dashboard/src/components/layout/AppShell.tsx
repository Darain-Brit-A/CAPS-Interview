import { NavLink, Outlet } from 'react-router-dom';
import { useThemeStore } from '@/store/themeStore';
import { OfflineBanner, RateLimitBanner } from '@/components/feedback/Banners';

const navItems = [
  { to: '/apod', label: 'APOD' },
  { to: '/mars-rover', label: 'Mars Rovers' },
  { to: '/neo', label: 'Near Earth Objects' },
  { to: '/favorites', label: 'Favorites' },
];

export function AppShell() {
  const { theme, setTheme } = useThemeStore();

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
    setTheme(next);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <RateLimitBanner />
      <OfflineBanner />
      <nav className="bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <span className="text-xl font-bold text-[var(--color-accent)]">
                Mission Control
              </span>
              <div className="hidden md:flex items-center gap-4">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-[var(--color-accent)] text-white'
                          : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-primary)]'
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-[var(--color-bg-primary)] transition-colors"
              aria-label={`Current theme: ${theme}. Click to change.`}
            >
              {theme === 'dark' ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
          </div>
        </div>
        {/* Mobile nav */}
        <div className="md:hidden border-t border-[var(--color-border)]">
          <div className="flex overflow-x-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `px-4 py-3 text-sm font-medium whitespace-nowrap ${
                    isActive
                      ? 'text-[var(--color-accent)] border-b-2 border-[var(--color-accent)]'
                      : 'text-[var(--color-text-secondary)]'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>
      </nav>
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <Outlet />
      </main>
    </div>
  );
}
