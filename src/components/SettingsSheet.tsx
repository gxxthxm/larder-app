import { useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Download, Monitor, Moon, RotateCcw, Sun, Trash2 } from 'lucide-react';
import { useUI } from '@/store/useUI';
import { useLarder } from '@/store/useLarder';
import { toast } from '@/store/useToasts';
import type { ThemePref } from '@/lib/types';
import { Sheet } from './ui/sheet';
import { Segmented } from './ui/segmented';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

const CURRENCIES = ['₹', '$', '€', '£'];

function exportJSON() {
  const { items, events, settings } = useLarder.getState();
  const blob = new Blob(
    [JSON.stringify({ exportedAt: new Date().toISOString(), items, events, settings }, null, 2)],
    {
      type: 'application/json',
    },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `larder-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast({ title: 'Exported your kitchen', description: a.download, emoji: '📦' });
}

export function SettingsSheet() {
  const open = useUI((s) => s.settingsOpen);
  const setOpen = useUI((s) => s.setSettingsOpen);
  const settings = useLarder((s) => s.settings);
  const update = useLarder((s) => s.updateSettings);
  const [confirm, setConfirm] = useState<'reset' | 'clear' | null>(null);

  const doConfirm = () => {
    if (confirm === 'reset') {
      useLarder.getState().resetDemo();
      toast({ title: 'Sample kitchen restored', emoji: '🧺' });
    } else if (confirm === 'clear') {
      useLarder.getState().clearAll();
      toast({ title: 'All data cleared', description: 'A fresh, empty larder.', emoji: '🧹' });
    }
    setConfirm(null);
    setOpen(false);
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setConfirm(null);
      }}
      title="Settings"
      size="sm"
    >
      <div className="space-y-6">
        <section>
          <h3 className="mb-2 text-sm font-semibold">Appearance</h3>
          <Segmented<ThemePref>
            id="theme"
            label="Theme"
            value={settings.theme}
            onChange={(theme) => update({ theme })}
            options={[
              {
                value: 'light',
                label: (
                  <>
                    <Sun className="size-4" /> Light
                  </>
                ),
              },
              {
                value: 'dark',
                label: (
                  <>
                    <Moon className="size-4" /> Dark
                  </>
                ),
              },
              {
                value: 'system',
                label: (
                  <>
                    <Monitor className="size-4" /> Auto
                  </>
                ),
              },
            ]}
          />
        </section>
        <section>
          <h3 className="mb-2 text-sm font-semibold">Currency</h3>
          <div className="flex gap-2" role="radiogroup" aria-label="Currency">
            {CURRENCIES.map((c) => (
              <motion.button
                key={c}
                type="button"
                role="radio"
                aria-checked={settings.currency === c}
                onClick={() => update({ currency: c })}
                whileTap={{ scale: 0.92 }}
                className={cn(
                  'grid size-12 place-items-center rounded-2xl text-lg font-semibold transition-colors',
                  settings.currency === c
                    ? 'bg-ink text-bg'
                    : 'bg-card-2 text-ink-2 hover:text-ink',
                )}
              >
                {c}
              </motion.button>
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-3">
            Changes the symbol only — prices are not converted.
          </p>
        </section>
        <section className="space-y-2">
          <h3 className="mb-2 text-sm font-semibold">Your data</h3>
          <SettingRow
            icon={<Download className="size-5" />}
            label="Export JSON"
            hint="Download items, history and settings"
            onClick={exportJSON}
          />
          <SettingRow
            icon={<RotateCcw className="size-5" />}
            label="Reset demo data"
            hint="Bring back the sample kitchen"
            onClick={() => setConfirm('reset')}
          />
          <SettingRow
            icon={<Trash2 className="size-5" />}
            label="Clear all data"
            hint="Start with an empty larder"
            onClick={() => setConfirm('clear')}
            danger
          />
          <AnimatePresence>
            {confirm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div
                  className="mt-2 rounded-[20px] bg-expired-soft p-4"
                  role="alertdialog"
                  aria-label="Confirm"
                >
                  <p className="text-sm font-semibold text-expired-ink">
                    {confirm === 'reset'
                      ? 'Replace everything with the sample kitchen?'
                      : 'Delete every item and all history?'}
                  </p>
                  <p className="mt-1 text-xs text-expired-ink/80">This can't be undone.</p>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setConfirm(null)}>
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="bg-expired text-white shadow-none hover:bg-expired"
                      onClick={doConfirm}
                    >
                      {confirm === 'reset' ? 'Reset' : 'Clear all'}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
        <p className="text-center text-xs text-ink-3">
          Larder · works offline · data stays on this device
        </p>
      </div>
    </Sheet>
  );
}

function SettingRow({
  icon,
  label,
  hint,
  onClick,
  danger,
}: {
  icon: ReactNode;
  label: string;
  hint: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      className="flex min-h-14 w-full items-center gap-3 rounded-[18px] bg-card-2 px-4 py-2.5 text-left transition-colors hover:bg-card-3"
    >
      <span className={cn(danger ? 'text-expired-ink' : 'text-ink-2')}>{icon}</span>
      <span className="flex-1">
        <span className={cn('block text-[15px] font-semibold', danger && 'text-expired-ink')}>
          {label}
        </span>
        <span className="block text-xs text-ink-2">{hint}</span>
      </span>
    </motion.button>
  );
}
