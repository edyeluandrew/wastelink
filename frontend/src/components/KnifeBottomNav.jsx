import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import './knife-bottom-nav.css';

const STORAGE_KEY = 'wastelink-bottom-nav-offset';
const MIN_OFFSET = 0;
const MAX_OFFSET = 220;
const SNAP_STEP = 44;

const loadSavedOffset = () => {
  try {
    const saved = Number(localStorage.getItem(STORAGE_KEY));
    if (Number.isFinite(saved)) {
      return Math.min(MAX_OFFSET, Math.max(MIN_OFFSET, saved));
    }
  } catch {
    // ignore storage errors
  }
  return 0;
};

const snapOffset = (value) => Math.round(value / SNAP_STEP) * SNAP_STEP;

/**
 * Skeuomorphic knife-shaped bottom navigation (mobile only).
 * Drag the handle up/down when it covers page buttons; double-tap handle to reset.
 */
export default function KnifeBottomNav({ items = [], isActive, extraActions = [] }) {
  const checkActive = (item) => (typeof isActive === 'function' ? isActive(item) : false);
  const [bottomOffset, setBottomOffset] = useState(loadSavedOffset);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ startY: 0, startOffset: 0, dragging: false });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(bottomOffset));
    } catch {
      // ignore storage errors
    }
  }, [bottomOffset]);

  const finishDrag = useCallback((offset) => {
    dragRef.current.dragging = false;
    setIsDragging(false);
    const snapped = snapOffset(offset);
    setBottomOffset(snapped);
  }, []);

  const onHandlePointerDown = (event) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      startY: event.clientY,
      startOffset: bottomOffset,
      dragging: true,
    };
    setIsDragging(true);
  };

  const onHandlePointerMove = (event) => {
    if (!dragRef.current.dragging) return;
    const delta = dragRef.current.startY - event.clientY;
    const next = Math.min(
      MAX_OFFSET,
      Math.max(MIN_OFFSET, dragRef.current.startOffset + delta),
    );
    setBottomOffset(next);
  };

  const onHandlePointerUp = (event) => {
    if (!dragRef.current.dragging) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    const delta = dragRef.current.startY - event.clientY;
    const next = Math.min(
      MAX_OFFSET,
      Math.max(MIN_OFFSET, dragRef.current.startOffset + delta),
    );
    finishDrag(next);
  };

  const resetOffset = () => {
    dragRef.current.dragging = false;
    setIsDragging(false);
    setBottomOffset(0);
  };

  return (
    <div
      className={`knife-nav-shell${isDragging ? ' is-dragging' : ''}`}
      style={{ '--knife-nav-offset': `${bottomOffset}px` }}
    >
      <nav className="knife-nav" aria-label="Main navigation">
        <div className="knife-tip" aria-hidden="true">
          <img src="/brand/wastelink-icon.png" alt="" />
        </div>

        <div className="knife-blade">
          <div className="knife-blade-inner">
            {items.map((item) => {
              const active = checkActive(item);
              const Icon = item.icon;
              const label = item.shortLabel || item.label;

              if (item.onClick) {
                return (
                  <button
                    key={item.key || item.label}
                    type="button"
                    onClick={item.onClick}
                    className={`knife-nav-item${active ? ' is-active' : ''}`}
                  >
                    {Icon && <Icon aria-hidden="true" />}
                    <span className="knife-nav-item-label">{label}</span>
                    <span className="knife-active-line" aria-hidden="true" />
                  </button>
                );
              }

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`knife-nav-item${active ? ' is-active' : ''}`}
                  aria-current={active ? 'page' : undefined}
                >
                  {Icon && <Icon aria-hidden="true" />}
                  <span className="knife-nav-item-label">{label}</span>
                  <span className="knife-active-line" aria-hidden="true" />
                </Link>
              );
            })}

            {extraActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.key || action.label}
                  type="button"
                  onClick={action.onClick}
                  className="knife-nav-item"
                >
                  {Icon && <Icon aria-hidden="true" />}
                  <span className="knife-nav-item-label">{action.shortLabel || action.label}</span>
                  <span className="knife-active-line" aria-hidden="true" />
                </button>
              );
            })}
          </div>
        </div>

        <div className="knife-bolster" aria-hidden="true" />
        <div
          className="knife-handle"
          role="button"
          tabIndex={0}
          aria-label="Drag to move navigation. Double-tap to reset position."
          onPointerDown={onHandlePointerDown}
          onPointerMove={onHandlePointerMove}
          onPointerUp={onHandlePointerUp}
          onPointerCancel={onHandlePointerUp}
          onDoubleClick={resetOffset}
          onKeyDown={(event) => {
            if (event.key === 'ArrowUp') {
              event.preventDefault();
              setBottomOffset((current) => snapOffset(Math.min(MAX_OFFSET, current + SNAP_STEP)));
            }
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setBottomOffset((current) => snapOffset(Math.max(MIN_OFFSET, current - SNAP_STEP)));
            }
            if (event.key === 'Home') resetOffset();
          }}
        >
          <span className="knife-handle-grip" aria-hidden="true" />
          <span className="knife-handle-pin" aria-hidden="true" />
        </div>
      </nav>
    </div>
  );
}
