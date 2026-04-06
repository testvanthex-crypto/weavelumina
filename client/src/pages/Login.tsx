import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

type Mode = "login" | "register";

const glowBorder =
  "relative overflow-hidden rounded-2xl border border-[#1a1a1a] bg-[#0a0a0a] shadow-[0_0_0_1px_rgba(255,255,255,0.03)]";

export default function Login() {
  const [mode, setMode] = useState<Mode>("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const { user, loading } = useAuth();
  const [_, setLocation] = useLocation();
  const utils = trpc.useUtils();

  useEffect(() => {
    if (user) {
      setLocation("/dashboard");
    }
  }, [user, setLocation]);

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: async ({ user }) => {
      toast.success(`Welcome back, ${user.name || "creator"}!`);
      await utils.auth.me.invalidate();
      setLocation("/dashboard");
    },
    onError: error => {
      toast.error(error.message || "Login failed");
    },
  });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: async ({ user }) => {
      toast.success("Account created — you’re in!");
      await utils.auth.me.invalidate();
      setLocation("/dashboard");
    },
    onError: error => {
      toast.error(error.message || "Registration failed");
    },
  });

  const isSubmitting = loginMutation.isPending || registerMutation.isPending;

  const title = useMemo(
    () => (mode === "login" ? "Welcome back" : "Create your access"),
    [mode]
  );

  const subtitle = useMemo(
    () =>
      mode === "login"
        ? "Enter your email to access the client console."
        : "Unlock the LuminaWeave portal with a quick signup.",
    [mode]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "login") {
      loginMutation.mutate({ email: form.email, password: form.password });
    } else {
      registerMutation.mutate({
        name: form.name || "Creator",
        email: form.email,
        password: form.password,
      });
    }
  };

  const updateField = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }));

  return (
    <div className="page-fade min-h-screen bg-gradient-to-br from-[#050505] via-[#0b0b0b] to-[#0f0c05] text-white relative">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -left-32 -top-32 h-64 w-64 rounded-full bg-[#C9A84C]/10 blur-3xl" />
        <div className="absolute right-0 bottom-0 h-72 w-72 rounded-full bg-[#8B7A2E]/15 blur-3xl" />
      </div>

      <div className="max-w-5xl mx-auto px-6 py-16 relative z-10 flex flex-col gap-12">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-gray-500 mb-2">LuminaWeave Portal</p>
            <h1 className="text-3xl md:text-4xl font-semibold text-white">Sign in with the atelier palette</h1>
          </div>
          <Button
            variant="ghost"
            className="border border-[#1f1f1f] bg-[#0f0f0f] hover:border-[#C9A84C]/60 text-sm"
            onClick={() => setLocation("/")}
          >
            ← Back to site
          </Button>
        </header>

        <div className="grid md:grid-cols-2 gap-8 items-start">
          <div className={`${glowBorder} p-8 space-y-6`}>
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#C9A84C]/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-[#C9A84C]">
                Trusted Access
              </div>
              <h2 className="text-2xl font-semibold">{title}</h2>
              <p className="text-gray-400 text-sm leading-relaxed">{subtitle}</p>
            </div>

          <div className="flex gap-2 bg-[#0f0f0f] p-1 rounded-full border border-[#1a1a1a]">
            {(["login", "register"] as Mode[]).map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setMode(tab)}
                  className={`flex-1 py-2 rounded-full text-sm font-medium transition-all ${
                    mode === tab
                      ? "bg-[#C9A84C] text-[#050505] shadow-lg"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  {tab === "login" ? "Sign in" : "Register"}
                </button>
              ))}
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              {mode === "register" && (
                <div className="space-y-2">
                  <Label className="text-sm text-gray-300">Name</Label>
                  <Input
                    value={form.name}
                    onChange={updateField("name")}
                    placeholder="Your name"
                    className="bg-[#111] border-[#1f1f1f] text-white placeholder:text-gray-600"
                    required
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-sm text-gray-300">Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={updateField("email")}
                  placeholder="you@example.com"
                  className="bg-[#111] border-[#1f1f1f] text-white placeholder:text-gray-600"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-gray-300">Password</Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={updateField("password")}
                  placeholder="Minimum 8 characters"
                  className="bg-[#111] border-[#1f1f1f] text-white placeholder:text-gray-600"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#C9A84C] text-[#050505] hover:bg-[#D4B85C] font-semibold h-11"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Processing...
                  </span>
                ) : mode === "login" ? (
                  "Sign in"
                ) : (
                  "Create account"
                )}
              </Button>
            </form>

          </div>

          <Card className="bg-[#0b0b0b]/80 border border-[#1a1a1a] shadow-2xl backdrop-blur">
            <CardHeader>
              <CardTitle className="text-xl text-white">Why sign in?</CardTitle>
              <CardDescription className="text-gray-400 text-sm">
                Access the LuminaWeave dashboard to manage leads, monitor launches, and keep your digital atelier humming.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Feature title="Lead Intelligence" body="See every inquiry, status, and follow-up in one gilded view." />
              <Feature title="Protected by design" body="Sessions are sealed with HttpOnly cookies and strong hashing." />
              <Feature title="Stay in flow" body="Login flow mirrors the site’s gold-on-obsidian palette for zero brand drift." />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="p-4 rounded-xl border border-[#1f1f1f] bg-[#0e0e0e] hover:border-[#C9A84C]/40 transition-colors">
      <p className="text-sm uppercase tracking-[0.2em] text-[#C9A84C] mb-2">{title}</p>
      <p className="text-gray-400 text-sm leading-relaxed">{body}</p>
    </div>
  );
}
