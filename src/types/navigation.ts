import type { ComponentType } from 'react';

export type NavigationGroup = 'main' | 'category' | 'subcategory' | string;

export interface NavigationItem {
  id: number | string;
  label: string;
  link: string;
  icon?: string;
  group: NavigationGroup;
  parentLabel?: string;
  children?: NavigationItem[];
}

export interface AdminNavChild<TabId extends string = string> {
  id: TabId;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

export interface AdminNavItem<TabId extends string = string> {
  id: TabId | string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  isGroup?: boolean;
  children?: AdminNavChild<TabId>[];
}
