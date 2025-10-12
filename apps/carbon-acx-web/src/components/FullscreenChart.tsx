import { useState, useEffect, cloneElement, isValidElement } from 'react';
import { Maximize2, Minimize2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/button';

interface FullscreenChartProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

export default function FullscreenChart({ children, title, description }: FullscreenChartProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Clone children and override height for fullscreen
  const cloneChildrenWithFullscreenHeight = (node: React.ReactNode): React.ReactNode => {
    if (!isValidElement(node)) return node;

    // Calculate fullscreen chart height (viewport height minus header and padding)
    const fullscreenHeight = typeof window !== 'undefined'
      ? window.innerHeight - 200 // 200px for header, padding, and controls
      : 600;

    // If the child has children, recursively clone them too
    const clonedChildren = node.props.children
      ? cloneChildrenWithFullscreenHeight(node.props.children)
      : node.props.children;

    // Override height prop if it exists
    return cloneElement(node as React.ReactElement<any>, {
      ...node.props,
      height: node.props.height !== undefined ? fullscreenHeight : node.props.height,
      children: clonedChildren,
    });
  };

  // Handle ESC key to exit fullscreen
  useEffect(() => {
    if (!isFullscreen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFullscreen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  return (
    <>
      {/* Fullscreen toggle button */}
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-2 right-2 z-10 h-7 w-7 p-0 opacity-60 hover:opacity-100"
        onClick={() => setIsFullscreen(true)}
        title="Fullscreen"
      >
        <Maximize2 className="h-3.5 w-3.5" />
      </Button>

      {/* Regular view */}
      <div className="relative">
        {children}
      </div>

      {/* Fullscreen modal */}
      <AnimatePresence>
        {isFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm"
            onClick={() => setIsFullscreen(false)}
          >
            <div className="h-full w-full p-4 md:p-8" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  {title && <h2 className="text-xl font-bold text-white">{title}</h2>}
                  {description && <p className="text-sm text-gray-400 mt-1">{description}</p>}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-white hover:bg-white/10"
                    onClick={() => setIsFullscreen(false)}
                    title="Exit fullscreen"
                  >
                    <Minimize2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-white hover:bg-white/10"
                    onClick={() => setIsFullscreen(false)}
                    title="Close"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Chart content */}
              <div className="h-[calc(100%-4rem)] w-full rounded-lg bg-white/5 backdrop-blur-md border border-white/10 p-6 overflow-auto">
                <div className="h-full">
                  {cloneChildrenWithFullscreenHeight(children)}
                </div>
              </div>

              {/* Keyboard hint */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-gray-500">
                Press ESC to exit fullscreen
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
