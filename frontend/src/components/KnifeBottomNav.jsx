import { Link } from 'react-router-dom';
import './knife-bottom-nav.css';

/**
 * Skeuomorphic knife-shaped bottom navigation (mobile only).
 */
export default function KnifeBottomNav({ items = [], isActive, extraActions = [] }) {
  const checkActive = (item) => (typeof isActive === 'function' ? isActive(item) : false);

  return (
    <div className="knife-nav-shell">
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
        <div className="knife-handle" aria-hidden="true">
          <span className="knife-handle-pin" />
        </div>
      </nav>
    </div>
  );
}
