import { LayoutDashboard, ClipboardList, BarChart3, Settings } from 'lucide-react';
import type { NavId } from '../types';
import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  id:    NavId;
  icon:  LucideIcon;
  label: string;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Principal',
    items: [
      { id: 'dashboard', icon: LayoutDashboard, label: 'Panel de Control' },
      { id: 'surveys',   icon: ClipboardList,   label: 'Encuestas'        },
      { id: 'analytics', icon: BarChart3,        label: 'Análisis'        },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { id: 'settings', icon: Settings, label: 'Configuración' },
    ],
  },
];
