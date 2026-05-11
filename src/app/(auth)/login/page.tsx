"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Zap, Target, TrendingUp, Users, Brain } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Min 6 characters"),
});
type LoginForm = z.infer<typeof loginSchema>;

const features = [
  { icon: Brain, text: "AI-powered lead scoring & insights" },
  { icon: Target, text: "Smart pipeline with drag & drop" },
  { icon: TrendingUp, text: "Real-time reports & analytics" },
  { icon: Users, text: "Team collaboration & task management" },
];

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginForm) {
    setLoading(true);
    try {
      const result = await signIn("credentials", { ...data, redirect: false });
      if (result?.error) toast.error("Invalid email or password");
      else { router.push("/dashboard"); router.refresh(); }
    } catch { toast.error("Something went wrong"); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div
        className="hidden lg:flex lg:w-[52%] flex-col justify-between p-12"
        style={{ background: "linear-gradient(145deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)" }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-bold text-xl tracking-tight">LeadOS</span>
        </div>

        {/* Hero */}
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6 text-xs font-semibold"
            style={{ background: "rgba(99,102,241,0.2)", color: "#a5b4fc" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
            AI-Powered Sales Platform
          </div>
          <h1 className="text-5xl font-black text-white leading-tight mb-4">
            Close more deals,<br />
            <span style={{ background: "linear-gradient(135deg,#818cf8,#c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              faster than ever.
            </span>
          </h1>
          <p className="text-lg mb-10" style={{ color: "#94a3b8" }}>
            Manage leads, automate follow-ups, and let AI do the heavy lifting so your team can focus on closing.
          </p>

          <div className="space-y-4">
            {features.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(99,102,241,0.15)" }}>
                  <Icon className="w-4 h-4" style={{ color: "#818cf8" }} />
                </div>
                <span className="text-sm font-medium" style={{ color: "#cbd5e1" }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom quote */}
        <div className="border-t pt-6" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <p className="text-sm italic" style={{ color: "#64748b" }}>
            "LeadOS cut our response time by 60% and doubled our close rate in 3 months."
          </p>
          <p className="text-xs mt-2 font-semibold" style={{ color: "#475569" }}>— Sales Director, TechVentures</p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8" style={{ background: "#f8f9fc" }}>
        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900">LeadOS</span>
          </div>

          <h2 className="text-3xl font-black text-gray-900 mb-1">Welcome back</h2>
          <p className="text-gray-500 mb-8">Sign in to your workspace</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
              <input
                {...register("email")}
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 transition text-sm bg-white font-medium placeholder:font-normal placeholder:text-gray-400"
              />
              {errors.email && <p className="mt-1 text-xs text-red-500 font-medium">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
              <input
                {...register("password")}
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 transition text-sm bg-white font-medium"
              />
              {errors.password && <p className="mt-1 text-xs text-red-500 font-medium">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl text-white font-bold text-sm transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
              style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", boxShadow: "0 4px 20px rgba(99,102,241,0.4)" }}
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</> : "Sign in →"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
