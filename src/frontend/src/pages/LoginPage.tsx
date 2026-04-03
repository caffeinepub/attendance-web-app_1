import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock, Eye, EyeOff, Loader2, LogIn } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { getBackend } from "../lib/getBackend";

const ADMIN_MOBILE = "9999999999";
const ADMIN_PASSWORD = "Zaira@1234";

export interface EmpSession {
  name: string;
  mobile: string;
  shiftStart: string;
  shiftEnd: string;
  isAdmin: boolean;
}

interface LoginPageProps {
  onLogin: (emp: EmpSession) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!mobile.trim()) {
      toast.error("Please enter your mobile number");
      return;
    }
    if (!password.trim()) {
      toast.error("Please enter your password");
      return;
    }
    setLoading(true);
    try {
      // Admin login check
      if (mobile.trim() === ADMIN_MOBILE) {
        if (password !== ADMIN_PASSWORD) {
          toast.error("Incorrect admin password");
          return;
        }
        const session: EmpSession = {
          name: "Administrator",
          mobile: ADMIN_MOBILE,
          shiftStart: "10:30",
          shiftEnd: "20:00",
          isAdmin: true,
        };
        onLogin(session);
        toast.success("Welcome, Administrator!");
        return;
      }

      // Employee login — use loginEmployee which checks password and returns shift times
      const b = await getBackend();
      const result = await b.loginEmployee(mobile.trim(), password);

      if ("err" in result) {
        toast.error(result.err);
        return;
      }

      const emp = result.ok;
      const session: EmpSession = {
        name: emp.name,
        mobile: emp.mobile,
        shiftStart: emp.shiftStart || "10:30",
        shiftEnd: emp.shiftEnd || "20:00",
        isAdmin: false,
      };
      onLogin(session);
      toast.success(`Welcome, ${emp.name}!`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`Login failed: ${msg.slice(0, 80)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: "#0b1120" }}
    >
      {/* Background subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative z-10 w-full max-w-md mx-auto px-4">
        {/* Branding header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 mb-4 shadow-lg shadow-blue-600/30">
            <Clock className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            TrackerPro
          </h1>
          <p className="text-slate-400 text-sm mt-1">HR Attendance System</p>
        </div>

        {/* Login card */}
        <div
          className="rounded-2xl border border-white/10 shadow-2xl p-8"
          style={{ backgroundColor: "#0f1929" }}
          data-ocid="login.card"
        >
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-white">Sign in</h2>
            <p className="text-slate-400 text-sm mt-1">
              Enter your mobile number and password to access the system
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <Label
                htmlFor="mobile"
                className="text-slate-300 text-sm font-medium"
              >
                Mobile Number
              </Label>
              <Input
                id="mobile"
                data-ocid="login.mobile.input"
                type="tel"
                placeholder="Enter mobile number"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className="bg-white/5 border-white/20 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20"
                autoComplete="tel"
                inputMode="numeric"
              />
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="password"
                className="text-slate-300 text-sm font-medium"
              >
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  data-ocid="login.password.input"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-white/5 border-white/20 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20 pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              data-ocid="login.submit.button"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <p className="text-center text-slate-500 text-xs mt-6">
            Contact your administrator if you forgot your password
          </p>
        </div>
      </div>
    </div>
  );
}
