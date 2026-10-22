import { lazy, Suspense, useEffect, useLayoutEffect, type ReactNode } from 'react';
import { MotionConfig, motion } from 'framer-motion';
import {
  HashRouter,
  Route,
  Routes,
  useLocation,
  useNavigate,
  type Location as RouterLocation,
} from 'react-router';
import { AppShell } from '@/components/AppShell';
import { Toaster } from '@/components/Toaster';
import { Confetti } from '@/components/Confetti';
import { ItemActionSheets } from '@/components/ItemActions';
import { SettingsSheet } from '@/components/SettingsSheet';
import { useLarder } from '@/store/useLarder';
import { useMediaQuery } from '@/lib/useMediaQuery';
import Home from '@/routes/Home';
import Inventory from '@/routes/Inventory';
import ItemDetail from '@/routes/ItemDetail';
import Recipes from '@/routes/Recipes';
import RecipeDetail from '@/routes/RecipeDetail';
import { AddSheet } from '@/routes/AddSheet';
import { EmptyState } from '@/components/EmptyState';

const Impact = lazy(() => import('@/routes/Impact'));

function useTheme() {
  const theme = useLarder((s) => s.settings.theme);
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  const dark = theme === 'dark' || (theme === 'system' && prefersDark);
  useLayoutEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', dark ? '#161412' : '#F6F1E7');
  }, [dark]);
}

function Page({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

function AppRoutes() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as { background?: RouterLocation } | null;
  const isAdd = location.pathname === '/add';
  const background =
    state?.background ?? (isAdd ? { ...location, pathname: '/', search: '' } : undefined);
  const pageLocation = isAdd ? (background as RouterLocation) : location;

  useEffect(() => {
    if (!isAdd) window.scrollTo({ top: 0 });
  }, [location.pathname, isAdd]);

  const closeAdd = () => {
    if (state?.background) navigate(-1);
    else navigate('/', { replace: true });
  };

  return (
    <AppShell>
      <Routes location={pageLocation} key={pageLocation.pathname}>
        <Route
          path="/"
          element={
            <Page>
              <Home />
            </Page>
          }
        />
        <Route
          path="/inventory"
          element={
            <Page>
              <Inventory />
            </Page>
          }
        />
        <Route
          path="/inventory/:id"
          element={
            <Page>
              <ItemDetail />
            </Page>
          }
        />
        <Route
          path="/recipes"
          element={
            <Page>
              <Recipes />
            </Page>
          }
        />
        <Route
          path="/recipes/:id"
          element={
            <Page>
              <RecipeDetail />
            </Page>
          }
        />
        <Route
          path="/impact"
          element={
            <Suspense fallback={<div className="h-96" aria-busy="true" />}>
              <Page>
                <Impact />
              </Page>
            </Suspense>
          }
        />
        <Route
          path="*"
          element={
            <EmptyState emoji="🧭" title="Page not found">
              That shelf doesn’t exist.
            </EmptyState>
          }
        />
      </Routes>
      <AddSheet
        open={isAdd}
        onClose={closeAdd}
        initialMode={new URLSearchParams(location.search).get('mode') === 'bulk' ? 'bulk' : 'quick'}
      />
    </AppShell>
  );
}

export default function App() {
  useTheme();
  return (
    <MotionConfig reducedMotion="user">
      <HashRouter>
        <AppRoutes />
        <ItemActionSheets />
        <SettingsSheet />
        <Toaster />
        <Confetti />
      </HashRouter>
    </MotionConfig>
  );
}
