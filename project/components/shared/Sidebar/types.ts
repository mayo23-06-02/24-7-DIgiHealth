import { LucideIcon } from "lucide-react";

/** The subset of the session the nav is allowed to make decisions on. */
export interface SidebarViewer {
  role: string;
  coverage?: "own" | "family" | "family_inactive" | "none";
}

export interface SidebarItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles?: string[];
  exact?: boolean;
  children?: SidebarSubItem[];
  /**
   * Hide this entry for a viewer the role check would otherwise admit.
   *
   * Role is not always enough: every patient may see Appointments, but only a
   * patient who pays their own bill has a Billing page to open. Declaring that
   * on the item keeps the rule next to the thing it governs, rather than as a
   * label comparison buried in the Sidebar's filter.
   */
  hidden?: (viewer: SidebarViewer) => boolean;
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
