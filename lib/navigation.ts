import {
  CalendarDays,
  Inbox,
  LayoutDashboard,
  RefreshCw,
  Users,
  ShoppingCart,
  Package,
  Truck,
  Navigation,
  Calculator,
  UserSquare2,
  FolderKanban,
  Factory,
  LineChart,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  /** i18n key under `nav.*` for the label. */
  labelKey: string;
  href: string;
  icon: LucideIcon;
  shortcut?: string;
  /** Optional fallback English description used by command palette. */
  description?: string;
};

export type NavGroup = {
  /** i18n key under `nav.*` for the group heading. */
  labelKey: string;
  items: NavItem[];
};

export const NAV_GROUPS: NavGroup[] = [
  {
    labelKey: "overview",
    items: [
      {
        labelKey: "dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        shortcut: "G D",
        description: "KPIs, recent activity, and quick actions",
      },
      {
        labelKey: "inbox",
        href: "/inbox",
        icon: Inbox,
        shortcut: "G N",
        description: "Tasks due, deals closing, and overdue deliveries",
      },
      {
        labelKey: "calendar",
        href: "/calendar",
        icon: CalendarDays,
        shortcut: "G A",
        description: "Unified view of activities, deal close dates, and deliveries",
      },
    ],
  },
  {
    labelKey: "sales",
    items: [
      {
        labelKey: "crm",
        href: "/crm",
        icon: Users,
        shortcut: "G C",
        description: "Leads, contacts, opportunities, and pipeline",
      },
      {
        labelKey: "salesModule",
        href: "/sales",
        icon: ShoppingCart,
        shortcut: "G S",
        description: "Quotes, orders, and invoicing",
      },
      {
        labelKey: "subscriptions",
        href: "/subscriptions",
        icon: RefreshCw,
        shortcut: "G U",
        description: "Recurring contracts and MRR",
      },
    ],
  },
  {
    labelKey: "operations",
    items: [
      {
        labelKey: "inventory",
        href: "/inventory",
        icon: Package,
        shortcut: "G I",
        description: "Products, stock levels, and movements",
      },
      {
        labelKey: "purchase",
        href: "/purchase",
        icon: Truck,
        shortcut: "G P",
        description: "Vendors, RFQs, and purchase orders",
      },
      {
        labelKey: "logistics",
        href: "/logistics",
        icon: Navigation,
        shortcut: "G L",
        description: "Fleet GPS tracking, vehicles, and live map",
      },
      {
        labelKey: "manufacturing",
        href: "/manufacturing",
        icon: Factory,
        description: "BOMs, work orders, and production planning",
      },
    ],
  },
  {
    labelKey: "finance",
    items: [
      {
        labelKey: "accounting",
        href: "/accounting",
        icon: Calculator,
        description: "Chart of accounts, journals, and reconciliation",
      },
      {
        labelKey: "reports",
        href: "/reports",
        icon: LineChart,
        shortcut: "G R",
        description: "Financial, sales, and operational reports",
      },
    ],
  },
  {
    labelKey: "people",
    items: [
      {
        labelKey: "hr",
        href: "/hr",
        icon: UserSquare2,
        description: "Employees, time-off, and onboarding",
      },
      {
        labelKey: "projects",
        href: "/projects",
        icon: FolderKanban,
        description: "Tasks, timesheets, and client work",
      },
    ],
  },
];

export const SETTINGS_ITEM: NavItem = {
  labelKey: "settings",
  href: "/settings/general",
  icon: Settings,
  description: "Workspace, members, billing, appearance",
};

export const ALL_NAV_ITEMS: NavItem[] = [
  ...NAV_GROUPS.flatMap((g) => g.items),
  SETTINGS_ITEM,
];
