import { useState } from 'react';
import { Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { useProfile } from '../contexts/ProfileContext';
import { exportOptions } from '../lib/exportUtils';
import { Button } from './ui/button';

/**
 * ExportButton - Download carbon profile data
 *
 * Features:
 * - Multiple export formats (CSV, JSON, Text)
 * - Dropdown menu
 * - One-click exports
 */

export default function ExportButton() {
  const { profile, history } = useProfile();
  const [isOpen, setIsOpen] = useState(false);

  const isEmpty = profile.activities.length === 0 && profile.calculatorResults.length === 0;

  if (isEmpty) {
    return null;
  }

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="gap-2"
      >
        <Download className="h-4 w-4" />
        Export
      </Button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown menu */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-2 w-72 bg-surface border border-border rounded-lg shadow-lg overflow-hidden z-50"
            >
              <div className="p-2">
                <p className="text-xs text-text-muted uppercase tracking-wide px-2 py-1">
                  Export Format
                </p>

                {exportOptions.map((option) => (
                  <button
                    key={option.format}
                    onClick={() => {
                      option.action(profile, history);
                      setIsOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded hover:bg-accent-50 transition-colors group"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{option.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground group-hover:text-accent-600">
                          {option.label}
                        </p>
                        <p className="text-xs text-text-muted mt-0.5">
                          {option.description}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="border-t border-border p-2 bg-neutral-50">
                <p className="text-xs text-text-muted px-2">
                  Downloads include activities, calculator results, and historical tracking
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
