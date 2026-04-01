import { cn } from "@/lib/utils";
import {
  ClipboardList,
  Clock,
  LayoutGrid,
  Menu,
  Settings,
  User,
  X,
} from "lucide-react";
import { useState } from "react";
import type { Page } from "../App";

const navItems: { id: Page; label: string; icon: React.ReactNode }[] = [
  {
    id: "mark",
    label: "Mark Attendance",
    icon: <ClipboardList className="w-4 h-4 shrink-0" />,
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
  },
];

interface NavProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

function formatDate() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function SidebarContent({
  currentPage,
  onNavigate,
  onClose,
}: NavProps & { onClose?: () => void }) {
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
              onNavigate(item.id);
              onClose?.();
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

      {/* Bottom */}
      <div className="mx-5 border-t border-white/10" />
      <div className="px-5 py-4 shrink-0">
        <p className="text-[10px] uppercase tracking-widest text-slate-600 font-semibold mb-1">
          Today
        </p>
        <p className="text-xs text-white mb-3">{formatDate()}</p>
        <p className="text-[11px] text-slate-500">TrackerPro System</p>
        <p className="text-[11px] text-slate-600">v1.0.0</p>
      </div>
    </div>
  );
}

export default function Nav({ currentPage, onNavigate }: NavProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex flex-col w-48 shrink-0 h-screen sticky top-0"
        style={{ backgroundColor: "#0f1929" }}
      >
        <SidebarContent currentPage={currentPage} onNavigate={onNavigate} />
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
            />
          </div>
        </button>
      )}
    </>
  );
}
