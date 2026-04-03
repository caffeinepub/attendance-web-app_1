import { Toaster } from "@/components/ui/sonner";
import { useState } from "react";
import Nav from "./components/Nav";
import AdminDashboard from "./pages/AdminDashboard";
import AdminPanel from "./pages/AdminPanel";
import Dashboard from "./pages/Dashboard";
import LoginPage, { type EmpSession } from "./pages/LoginPage";
import MarkAttendance from "./pages/MarkAttendance";
import MyAttendance from "./pages/MyAttendance";

export type Page = "mark" | "dashboard" | "my" | "admin" | "admin-dashboard";

export default function App() {
  const [page, setPage] = useState<Page>("mark");
  const [empSession, setEmpSession] = useState<EmpSession | null>(() => {
    const s = sessionStorage.getItem("emp_session");
    return s ? (JSON.parse(s) as EmpSession) : null;
  });

  function handleLogin(emp: EmpSession) {
    sessionStorage.setItem("emp_session", JSON.stringify(emp));
    setEmpSession(emp);
  }

  function handleLogout() {
    sessionStorage.removeItem("emp_session");
    setEmpSession(null);
  }

  if (!empSession) {
    return (
      <>
        <LoginPage onLogin={handleLogin} />
        <Toaster richColors position="top-right" />
      </>
    );
  }

  const renderPage = () => {
    switch (page) {
      case "mark":
        return (
          <MarkAttendance
            loggedInEmployee={empSession}
            onLogout={handleLogout}
          />
        );
      case "dashboard":
        return <Dashboard />;
      case "my":
        return <MyAttendance />;
      case "admin":
        return <AdminPanel />;
      case "admin-dashboard":
        return <AdminDashboard />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Nav
        currentPage={page}
        onNavigate={setPage}
        loggedInEmployee={empSession}
        onLogout={handleLogout}
      />
      <div className="flex-1 flex flex-col overflow-auto md:pt-0 pt-12">
        <main className="flex-1 p-6 max-w-5xl mx-auto w-full">
          {renderPage()}
        </main>
        <footer className="text-center text-xs text-muted-foreground py-4 border-t border-border">
          © {new Date().getFullYear()}. Built with love using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            caffeine.ai
          </a>
        </footer>
      </div>
      <Toaster richColors position="top-right" />
    </div>
  );
}
