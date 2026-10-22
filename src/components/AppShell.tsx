import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { NavLink, useLocation, useNavigate } from 'react-router';
import { ChartColumn, ChefHat, House, Plus, Refrigerator, Settings } from 'lucide-react';
import { cn, formatMoney } from '@/lib/utils';
import { useUI } from '@/store/useUI';
import { useLarder } from '@/store/useLarder';
import { monthStats } from '@/lib/impact';
import { LogoMark } from './Logo';
import { AnimatedNumber } from './AnimatedNumber';

const NAV = [
  { to: '/', label: 'Home', icon: House },
  { to: '/inventory', label: 'Kitchen', icon: Refrigerator },
  { to: '/recipes', label: 'Recipes', icon: ChefHat },
  { to: '/impact', label: 'Impact', icon: ChartColumn },
];

function isActive(pathname: string, to: string) {
  return to === '/' ? pathname === '/' : pathname.startsWith(to);
}

function useOpenAdd() {
  const navigate = useNavigate();
  const location = useLocation();
  return () => navigate('/add', { state: { background: location } });
}

function TabBar({ pathname }: { pathname: string }) {
  const openAdd = useOpenAdd();
  const items = [NAV[0], NAV[1], null, NAV[2], NAV[3]];
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(10px,env(safe-area-inset-bottom))] md:hidden"
    >
      <div className="mx-auto flex max-w-md items-center justify-between rounded-[28px] border border-line bg-card/85 px-1.5 py-1.5 shadow-float backdrop-blur-xl backdrop-saturate-150">
        {items.map((n) => {
          if (!n)
            return (
              <motion.button
                key="add"
                type="button"
                onClick={openAdd}
                whileTap={{ scale: 0.88 }}
                whileHover={{ scale: 1.05 }}
                aria-label="Add groceries"
                className="mx-1 grid size-[52px] place-items-center rounded-[20px] bg-brand text-brand-ink shadow-[0_8px_20px_-6px_var(--brand)]"
              >
                <Plus className="size-6" strokeWidth={2.6} />
              </motion.button>
            );
          const active = isActive(pathname, n.to);
          const Icon = n.icon;
          return (
            <NavLink
              key={n.to}
              to={n.to}
              aria-current={active ? 'page' : undefined}
              className="relative flex h-[52px] flex-1 flex-col items-center justify-center gap-0.5 rounded-[20px]"
            >
              {active && (
                <motion.span
                  layoutId="tab-pill"
                  className="absolute inset-0 rounded-[20px] bg-card-2"
                  transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                />
              )}
              <motion.span
                className="relative"
                animate={{ y: active ? -1 : 0, scale: active ? 1.06 : 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              >
                <Icon
                  className={cn('size-[22px]', active ? 'text-ink' : 'text-ink-3')}
                  strokeWidth={active ? 2.4 : 2}
                />
              </motion.span>
              <span
                className={cn(
                  'relative text-[10.5px] font-semibold',
                  active ? 'text-ink' : 'text-ink-3',
                )}
              >
                {n.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

function Sidebar({ pathname }: { pathname: string }) {
  const openAdd = useOpenAdd();
  const openSettings = useUI((s) => s.setSettingsOpen);
  const events = useLarder((s) => s.events);
  const currency = useLarder((s) => s.settings.currency);
  const saved = monthStats(events).saved;

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-line bg-bg-deep/60 px-4 py-6 md:flex">
      <div className="flex items-center gap-2.5 px-2">
        <LogoMark />
        <span className="font-display text-[22px] font-semibold tracking-tight">Larder</span>
      </div>
      <motion.button
        type="button"
        onClick={openAdd}
        whileTap={{ scale: 0.96 }}
        className="mt-7 flex h-12 items-center justify-center gap-2 rounded-[18px] bg-brand font-semibold text-brand-ink shadow-[0_8px_20px_-8px_var(--brand)] transition-colors hover:bg-brand-strong"
      >
        <Plus className="size-5" strokeWidth={2.6} /> Add groceries
      </motion.button>
      <nav aria-label="Main" className="mt-6 flex flex-col gap-1">
        {NAV.map((n) => {
          const active = isActive(pathname, n.to);
          const Icon = n.icon;
          return (
            <NavLink
              key={n.to}
              to={n.to}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative flex h-11 items-center gap-3 rounded-[14px] px-3 text-[15px] font-semibold transition-colors',
                active ? 'text-ink' : 'text-ink-2 hover:text-ink',
              )}
            >
              {active && (
                <motion.span
                  layoutId="side-pill"
                  className="absolute inset-0 rounded-[14px] bg-card shadow-card"
                  transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                />
              )}
              <Icon className="relative size-5" strokeWidth={active ? 2.4 : 2} />
              <span className="relative">{n.label}</span>
            </NavLink>
          );
        })}
      </nav>
      <div className="mt-auto space-y-3">
        <NavLink to="/impact" className="card block p-4">
          <p className="text-xs font-bold tracking-wider text-ink-3 uppercase">Saved this month</p>
          <AnimatedNumber
            value={saved}
            format={(n) => formatMoney(n, currency)}
            className="tabular mt-1 block font-display text-2xl font-semibold text-brand"
          />
        </NavLink>
        <button
          type="button"
          onClick={() => openSettings(true)}
          className="flex h-11 w-full items-center gap-3 rounded-[14px] px-3 text-[15px] font-semibold text-ink-2 transition-colors hover:bg-card hover:text-ink"
        >
          <Settings className="size-5" /> Settings
        </button>
      </div>
    </aside>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div className="min-h-dvh">
      <a
        href="#main"
        className="sr-only z-50 rounded-full bg-ink px-4 py-2 text-bg focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <Sidebar pathname={pathname} />
      <div className="md:pl-[248px]">
        <main
          id="main"
          className="mx-auto w-full max-w-[1040px] px-4 pb-[calc(120px+env(safe-area-inset-bottom))] md:px-10 md:pb-16"
        >
          {children}
        </main>
      </div>
      <TabBar pathname={pathname} />
    </div>
  );
}
