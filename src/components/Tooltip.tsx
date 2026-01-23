import { useState, useRef, useEffect, useCallback, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface TooltipProps {
  content: ReactNode;
  children: (props: {
    onMouseEnter: () => void;
    onMouseLeave: () => void;
    ref: React.RefObject<HTMLDivElement | null>;
  }) => ReactNode;
  delay?: number;
}

export function Tooltip({ content, children, delay = 200 }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number; placement: 'top' | 'bottom' | 'left' | 'right' }>({ x: 0, y: 0, placement: 'top' });
  const timeoutRef = useRef<number | null>(null);
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const padding = 8;
    const tooltipWidth = 200; // estimate
    const tooltipHeight = 100; // estimate (be generous)

    // Default: show below (safer, avoids top cutoff issues)
    let x = rect.left + rect.width / 2;
    let y = rect.bottom + padding;
    let placement: 'top' | 'bottom' | 'left' | 'right' = 'bottom';

    // Only show above if there's plenty of room AND not enough room below
    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;

    if (spaceAbove > tooltipHeight + padding * 2 && spaceBelow < tooltipHeight + padding) {
      y = rect.top - padding;
      placement = 'top';
    }

    // Check horizontal bounds
    if (x - tooltipWidth / 2 < padding) {
      x = padding + tooltipWidth / 2;
    } else if (x + tooltipWidth / 2 > window.innerWidth - padding) {
      x = window.innerWidth - padding - tooltipWidth / 2;
    }

    setPosition({ x, y, placement });
  }, []);

  const showTooltip = useCallback(() => {
    timeoutRef.current = window.setTimeout(() => {
      calculatePosition();
      setIsVisible(true);
    }, delay);
  }, [delay, calculatePosition]);

  const hideTooltip = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsVisible(false);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (!content) {
    return <>{children({ onMouseEnter: () => {}, onMouseLeave: () => {}, ref: triggerRef })}</>;
  }

  const getTransform = () => {
    if (position.placement === 'bottom') {
      return 'translate(-50%, 0)';
    }
    return 'translate(-50%, -100%)';
  };

  return (
    <>
      {children({ onMouseEnter: showTooltip, onMouseLeave: hideTooltip, ref: triggerRef })}
      {isVisible && createPortal(
        <div
          ref={tooltipRef}
          className="fixed z-[100] pointer-events-none"
          style={{
            left: position.x,
            top: position.y,
            transform: getTransform(),
          }}
        >
          <div className={`bg-slate-800 border border-slate-600 px-3 py-2 text-xs text-slate-200 max-w-[200px] shadow-lg ${position.placement === 'bottom' ? 'mt-1' : 'mb-1'}`}>
            {content}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
