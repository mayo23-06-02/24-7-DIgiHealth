import { LucideIcon } from "lucide-react";

export interface SidebarItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles?: string[];
  exact?: boolean;
  children?: SidebarSubItem[];
}

export interface SidebarSubItem {
  href: string;
  label: string;
  icon?: LucideIcon;
}

export interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}
