import { ChevronRight } from 'lucide-react';
import type { NavItem as NavItemConfig } from '../../config/navigation';
import type { NavId } from '../../types';

interface Props extends NavItemConfig {
  active:   boolean;
  expanded: boolean;
  onClick:  (id: NavId) => void;
}

export default function NavItem({ id, icon: Icon, label, active, expanded, onClick }: Props) {
  return (
    <button
      onClick={() => onClick(id)}
      title={!expanded ? label : undefined}
      className={`nav-item ${active ? 'nav-item--active' : ''}`}
      style={{
        justifyContent: expanded ? 'flex-start' : 'center',
        paddingLeft:    expanded ? '10px' : '0px',
        paddingRight:   expanded ? '10px' : '0px',
        gap:            expanded ? '10px' : '0px',
      }}
    >
      <Icon size={15} className={`nav-item__icon ${active ? 'nav-item__icon--active' : ''}`} />
      <span
        className="nav-item__label"
        style={{ maxWidth: expanded ? '160px' : '0px', opacity: expanded ? 1 : 0 }}
      >
        {label}
      </span>
      {active && expanded && (
        <ChevronRight size={12} className="nav-item__chevron" />
      )}
    </button>
  );
}
