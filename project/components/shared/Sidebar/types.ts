import { IconType } from "react-icons";

export interface SidebarItem {
  href: string;
  label: string;
  icon: IconType;
  roles?: string[];
  exact?: boolean;
}

export interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}
