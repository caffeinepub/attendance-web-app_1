import { cn } from "@/lib/utils";
import {
  ClipboardList,
  Clock,
  LayoutGrid,
  LogOut,
  Menu,
  Settings,
  User,
  X,
} from "lucide-react";
import { useState } from "react";
import type { Page } from "../App";
import type { EmpSession } from "../pages/LoginPage";

const allNavItems: {
  id: Page;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
  hideForAdmin?: boolean;
}[] = [
  {
    id: "mark",
    label: "Mark Attendance",
    icon: <ClipboardList className="w-4 h-4 shrink-0" />,
    hideForAdmin: true,
  },
  {
    id: "dashboard",
    label: "Dashboard",
    icon: <LayoutGrid className="w-4 h-4 shrink-0" />,
  },
  {
    id: "my",
    label: "My Attendance",
    icon: <User className="w-4 h-4 shrink-0" />,
  },
  {
    id: "admin",
    label: "Admin Panel",
    icon: <Settings className="w-4 h-4 shrink-0" />,
    adminOnly: true,
  },
];

interface NavProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  loggedInEmployee?: EmpSession | null;
  onLogout?: () => void;
}

function formatDate() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function SidebarContent({
  currentPage,
  onNavigate,
  onClose,
  loggedInEmployee,
  onLogout,
}: NavProps & { onClose?: () => void }) {
  const isAdmin = loggedInEmployee?.isAdmin ?? false;
  const navItems = allNavItems.filter((item) => {
    if (item.hideForAdmin && isAdmin) return false;
    if (item.adminOnly && !isAdmin) return false;
    return true;
  });

  return (
    <div
      className="flex flex-col h-full"
      style={{ backgroundColor: "#0f1929" }}
    >
      {/* Logo */}
      <div className="px-5 pt-6 pb-5 shrink-0">
        <div className="flex items-center gap-2.5 mb-1">
          <Clock className="w-5 h-5 text-blue-400 shrink-0" />
          <span className="font-bold text-white text-lg tracking-tight">
            TrackerPro
          </span>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="ml-auto p-1 rounded text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <p className="text-[10px] tracking-widest uppercase text-slate-500 font-medium pl-7">
          HR Attendance System
        </p>
      </div>

      {/* Divider */}
      <div className="mx-5 border-t border-white/10" />

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <button
            type="button"
            key={item.id}
            data-ocid={`nav.${item.id}.link`}
            onClick={() => {
              if (onClose) {
                onClose();
                setTimeout(() => onNavigate(item.id), 250);
              } else {
                onNavigate(item.id);
              }
            }}
            className={cn(
              "flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-sm font-medium transition-all",
              currentPage === item.id
                ? "bg-blue-600 text-white"
                : "text-slate-400 hover:text-white hover:bg-white/10",
            )}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Divider */}
      <div className="mx-5 border-t border-white/10" />

      {/* Logged-in user section */}
      {loggedInEmployee && (
        <div className="px-4 py-3 shrink-0">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
              <span className="text-white text-[10px] font-bold">
                {getInitials(loggedInEmployee.name)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-semibold truncate">
                {loggedInEmployee.name}
              </p>
              <p className="text-slate-500 text-[10px] truncate">
                {loggedInEmployee.mobile}
              </p>
            </div>
          </div>
          <button
            type="button"
            data-ocid="nav.logout.button"
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md border border-white/10 text-slate-400 hover:text-white hover:border-white/20 hover:bg-white/5 transition-all text-xs font-medium"
          >
            <LogOut className="w-3 h-3" />
            Sign Out
          </button>
        </div>
      )}

      {/* Bottom */}
      <div className="px-5 py-3 shrink-0">
        <p className="text-[10px] uppercase tracking-widest text-slate-600 font-semibold mb-1">
          Today
        </p>
        <p className="text-xs text-white mb-2">{formatDate()}</p>
        <p className="text-[11px] text-slate-500">TrackerPro System</p>
        <p className="text-[11px] text-slate-600">v1.0.0</p>
      </div>
    </div>
  );
}

export default function Nav({
  currentPage,
  onNavigate,
  loggedInEmployee,
  onLogout,
}: NavProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex flex-col w-48 shrink-0 h-screen sticky top-0"
        style={{ backgroundColor: "#0f1929" }}
      >
        <SidebarContent
          currentPage={currentPage}
          onNavigate={onNavigate}
          loggedInEmployee={loggedInEmployee}
          onLogout={onLogout}
        />
      </aside>

      {/* Mobile top bar */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center gap-3 h-12 px-4 border-b border-white/10"
        style={{ backgroundColor: "#0f1929" }}
      >
        <button
          type="button"
          data-ocid="nav.mobile.menu_toggle"
          onClick={() => setMobileOpen(true)}
          className="p-1.5 rounded text-slate-400 hover:text-white transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <Clock className="w-4 h-4 text-blue-400" />
        <span className="font-bold text-white text-sm tracking-tight">
          TrackerPro
        </span>
        {loggedInEmployee && (
          <div className="ml-auto flex items-center gap-2">
            <span className="text-slate-400 text-xs truncate max-w-[100px]">
              {loggedInEmployee.name}
            </span>
          </div>
        )}
      </div>

      {/* Mobile slide-in drawer */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="md:hidden fixed inset-0 z-50 flex w-full text-left"
          onClick={() => setMobileOpen(false)}
          onKeyDown={(e) => e.key === "Escape" && setMobileOpen(false)}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative w-56 h-full shadow-2xl"
            style={{ backgroundColor: "#0f1929" }}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <SidebarContent
              currentPage={currentPage}
              onNavigate={onNavigate}
              onClose={() => setMobileOpen(false)}
              loggedInEmployee={loggedInEmployee}
              onLogout={onLogout}
            />
          </div>
        </button>
      )}
    </>
  );
}
