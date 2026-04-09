import { useEffect, useRef, useState } from "react";
// Removed useAuth
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { format } from "date-fns";
import {
  User, Package, Star, CreditCard, Calendar,
  Crown, ShieldCheck, CircleDot, Sparkles,
  ArrowLeft, MessageSquare, Clock, CheckCircle2,
  AlertCircle, XCircle, ChevronRight,
} from "lucide-react";
import FeedbackDialog from "@/components/FeedbackDialog";
import { Badge } from "@/components/ui/badge";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function AnimatedCounter({ target, duration = 1200 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const raf = useRef<number>(0);

  useEffect(() => {
    const start = performance.now();
    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);

  return <>{count}</>;
}

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className="h-3.5 w-3.5"
          style={{
            fill: s <= rating ? "#C9A84C" : "transparent",
            stroke: s <= rating ? "#C9A84C" : "#3a3a3a",
          }}
        />
      ))}
    </div>
  );
}

function OrderStatusIcon({ status }: { status: string }) {
  if (status === "completed") return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
  if (status === "failed") return <XCircle className="h-4 w-4 text-red-400" />;
  return <Clock className="h-4 w-4 text-[#C9A84C]" />;
}

function OrderStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; style: React.CSSProperties }> = {
    completed: {
      label: "Completed",
      style: { background: "rgba(16,185,129,0.12)", color: "#34d399", border: "1px solid rgba(16,185,129,0.3)" },
    },
    pending: {
      label: "Pending",
      style: { background: "rgba(201,168,76,0.1)", color: "#C9A84C", border: "1px solid rgba(201,168,76,0.3)" },
    },
    failed: {
      label: "Failed",
      style: { background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.25)" },
    },
  };
  const cfg = map[status] ?? map.pending;
  return (
    <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={cfg.style}>
      {cfg.label}
    </span>
  );
}

function SubStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; style: React.CSSProperties }> = {
    active: {
      label: "Active",
      style: { background: "rgba(201,168,76,0.12)", color: "#C9A84C", border: "1px solid rgba(201,168,76,0.3)" },
    },
    canceled: {
      label: "Canceled",
      style: { background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.25)" },
    },
    past_due: {
      label: "Past Due",
      style: { background: "rgba(251,146,60,0.1)", color: "#fb923c", border: "1px solid rgba(251,146,60,0.25)" },
    },
  };
  const cfg = map[status] ?? map.active;
  return (
    <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={cfg.style}>
      {cfg.label}
    </span>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: "overview", label: "Overview", icon: User },
  { id: "orders", label: "Orders", icon: Package },
  { id: "subscriptions", label: "Subscriptions", icon: CreditCard },
  { id: "feedback", label: "My Feedback", icon: MessageSquare },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Profile() {
  // const { user } = useAuth({ redirectOnUnauthenticated: true, redirectPath: "/login" }); // Auth system removed
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackOrder, setFeedbackOrder] = useState<{ id?: number; plan?: string } | null>(null);

  // Data fetches
  const { data: orders = [], refetch: refetchOrders } = trpc.profile.orders.useQuery(undefined, { enabled: !!user });
  const { data: subscriptions = [] } = trpc.profile.subscriptions.useQuery(undefined, { enabled: !!user });
  const { data: feedbackList = [], refetch: refetchFeedback } = trpc.feedback.list.useQuery(undefined, { enabled: !!user });

  const feedbackOrderIds = new Set(feedbackList.map((f: any) => f.orderId));

  // Stats
  const totalOrders = orders.length;
  const activeSubs = subscriptions.filter((s: any) => s.status === "active").length;
  const totalFeedback = feedbackList.length;
  const completedOrders = orders.filter((o: any) => o.status === "completed").length;

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : (user?.email?.[0]?.toUpperCase() ?? "U");

  const memberSince = user?.createdAt
    ? format(new Date(user.createdAt), "MMMM yyyy")
    : "—";

  if (!user) return null;

  return (
    <div
      className="min-h-screen text-white page-fade"
      style={{
        background: "linear-gradient(160deg, #050505 0%, #0a0905 50%, #050505 100%)",
      }}
    >
      {/* Ambient glow blobs */}
      <div
        className="fixed top-0 left-1/4 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(201,168,76,0.04) 0%, transparent 65%)",
          filter: "blur(40px)",
        }}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        {/* Back nav */}
        <button
          onClick={() => setLocation("/")}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#C9A84C] transition-colors group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Back to Home
        </button>

        {/* ── Profile Hero ── */}
        <div
          className="reveal-up rounded-2xl p-6 sm:p-8 relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #0e0e0e 0%, #0c0b05 100%)",
            border: "1px solid rgba(201,168,76,0.12)",
            boxShadow: "0 0 40px rgba(201,168,76,0.04), 0 20px 40px rgba(0,0,0,0.5)",
          }}
          ref={(el) => el && setTimeout(() => el.classList.add("revealed"), 50)}
        >
          {/* Background shimmer */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at 80% 20%, rgba(201,168,76,0.06) 0%, transparent 55%)",
            }}
          />

          <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Avatar */}
            <div className="relative">
              <div
                className="h-20 w-20 sm:h-24 sm:w-24 rounded-full flex items-center justify-center text-2xl sm:text-3xl font-bold"
                style={{
                  background: "linear-gradient(135deg, #1a1508, #2a2010)",
                  border: "2px solid rgba(201,168,76,0.35)",
                  boxShadow:
                    "0 0 0 4px rgba(201,168,76,0.06), 0 0 25px rgba(201,168,76,0.15)",
                  color: "#C9A84C",
                  fontFamily: "'Cormorant Garamond', serif",
                }}
              >
                {initials}
              </div>
              {user.role === "admin" && (
                <div
                  className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full flex items-center justify-center"
                  style={{ background: "#C9A84C", boxShadow: "0 0 12px rgba(201,168,76,0.5)" }}
                >
                  <Crown className="h-3 w-3 text-[#050505]" />
                </div>
              )}
            </div>

            {/* Identity */}
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1
                  className="text-2xl sm:text-3xl font-semibold"
                  style={{ fontFamily: "'Cormorant Garamond', serif", letterSpacing: "0.02em" }}
                >
                  {user.name || "Anonymous"}
                </h1>
                {user.role === "admin" ? (
                  <span
                    className="text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-widest"
                    style={{ background: "rgba(201,168,76,0.15)", color: "#C9A84C", border: "1px solid rgba(201,168,76,0.3)" }}
                  >
                    Admin
                  </span>
                ) : (
                  <span
                    className="text-xs px-2.5 py-1 rounded-full font-semibold uppercase tracking-widest"
                    style={{ background: "rgba(255,255,255,0.05)", color: "#888", border: "1px solid #222" }}
                  >
                    Member
                  </span>
                )}
              </div>
              <p className="text-gray-400 text-sm">{user.email}</p>
              <div className="flex items-center gap-1.5 text-xs text-gray-600 mt-1">
                <Calendar className="h-3 w-3" />
                <span>Member since {memberSince}</span>
              </div>
            </div>

            {/* Verified badge */}
            {user.isEmailVerified && (
              <div className="flex items-center gap-1.5 text-xs text-[#C9A84C]" title="Email verified">
                <ShieldCheck className="h-4 w-4" />
                <span className="hidden sm:inline">Verified</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Stats Strip ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 reveal-up" ref={(el) => el && setTimeout(() => el.classList.add("revealed"), 150)}>
          {[
            { label: "Total Orders", value: totalOrders, icon: Package, color: "#C9A84C" },
            { label: "Completed", value: completedOrders, icon: CheckCircle2, color: "#34d399" },
            { label: "Active Plans", value: activeSubs, icon: CircleDot, color: "#818cf8" },
            { label: "Feedback Given", value: totalFeedback, icon: Star, color: "#f472b6" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl p-4 text-center transition-all hover:scale-[1.02]"
              style={{
                background: "#0a0a0a",
                border: "1px solid #1a1a1a",
                boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
              }}
            >
              <stat.icon className="h-5 w-5 mx-auto mb-2" style={{ color: stat.color }} />
              <div className="text-2xl font-bold" style={{ color: stat.color }}>
                <AnimatedCounter target={stat.value} />
              </div>
              <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* ── Tab Bar ── */}
        <div
          className="flex gap-1 p-1 rounded-xl reveal-up"
          style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}
          ref={(el) => el && setTimeout(() => el.classList.add("revealed"), 250)}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200"
                style={{
                  background: isActive
                    ? "linear-gradient(135deg, rgba(201,168,76,0.15), rgba(201,168,76,0.08))"
                    : "transparent",
                  color: isActive ? "#C9A84C" : "#555",
                  border: isActive ? "1px solid rgba(201,168,76,0.25)" : "1px solid transparent",
                  boxShadow: isActive ? "0 0 15px rgba(201,168,76,0.08)" : "none",
                }}
              >
                <tab.icon className="h-3.5 w-3.5" />
                <span className="hidden xs:inline sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── Tab Content ── */}
        <div
          className="reveal-up"
          ref={(el) => el && setTimeout(() => el.classList.add("revealed"), 350)}
          style={{ minHeight: "240px" }}
        >
          {/* OVERVIEW TAB */}
          {activeTab === "overview" && (
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Profile Info Card */}
              <div
                className="rounded-xl p-5 space-y-4"
                style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <User className="h-4 w-4 text-[#C9A84C]" />
                  <span className="text-sm font-semibold text-gray-200">Account Details</span>
                </div>
                {[
                  { label: "Full Name", value: user.name || "Not set" },
                  { label: "Email", value: user.email || "—" },
                  { label: "Login Method", value: user.loginMethod || "Password" },
                  { label: "Role", value: user.role === "admin" ? "Administrator" : "Member" },
                  {
                    label: "Last Sign-in",
                    value: user.lastSignedIn
                      ? format(new Date(user.lastSignedIn), "MMM dd, yyyy HH:mm")
                      : "—",
                  },
                  { label: "Email Verified", value: user.isEmailVerified ? "✓ Verified" : "Not verified" },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-start justify-between gap-4 text-sm">
                    <span className="text-gray-500 shrink-0">{label}</span>
                    <span
                      className="text-right font-medium"
                      style={{ color: label === "Email Verified" && value === "✓ Verified" ? "#34d399" : "#e0e0e0" }}
                    >
                      {value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Quick Summary Card */}
              <div
                className="rounded-xl p-5 space-y-4"
                style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="h-4 w-4 text-[#C9A84C]" />
                  <span className="text-sm font-semibold text-gray-200">Activity Summary</span>
                </div>

                {/* Latest order */}
                {orders.length > 0 ? (
                  <div>
                    <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Latest Order</p>
                    <div
                      className="rounded-lg p-3 cursor-pointer hover:border-[#C9A84C]/30 transition-colors"
                      style={{ background: "#0f0f0f", border: "1px solid #1f1f1f" }}
                      onClick={() => setActiveTab("orders")}
                    >
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <p className="text-sm font-medium text-white">
                            {(orders[orders.length - 1] as any).gatewayOrderId ?? "Order"}
                          </p>
                          <p className="text-xs text-gray-500">
                            ${((orders[orders.length - 1] as any).amount / 100).toFixed(2)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <OrderStatusBadge status={(orders[orders.length - 1] as any).status} />
                          <ChevronRight className="h-3.5 w-3.5 text-gray-600" />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Package className="h-10 w-10 mx-auto text-gray-700 mb-2" />
                    <p className="text-sm text-gray-500">No orders yet</p>
                    <button
                      onClick={() => setLocation("/checkout")}
                      className="mt-3 text-xs text-[#C9A84C] hover:underline"
                    >
                      Browse plans →
                    </button>
                  </div>
                )}

                {/* Active subscription */}
                {subscriptions.filter((s: any) => s.status === "active").length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Active Plan</p>
                    <div
                      className="rounded-lg p-3"
                      style={{ background: "#0f0f0f", border: "1px solid rgba(201,168,76,0.15)" }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Crown className="h-3.5 w-3.5 text-[#C9A84C]" />
                          <span className="text-sm font-medium text-[#C9A84C]">
                            {(subscriptions.find((s: any) => s.status === "active") as any)?.planId}
                          </span>
                        </div>
                        <SubStatusBadge status="active" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ORDERS TAB */}
          {activeTab === "orders" && (
            <div className="space-y-3">
              {orders.length === 0 ? (
                <EmptyState
                  icon={Package}
                  title="No orders yet"
                  desc="Once you place an order it will appear here."
                  cta="Browse Plans"
                  onCta={() => setLocation("/checkout")}
                />
              ) : (
                orders.map((order: any) => {
                  const hasFeedback = feedbackOrderIds.has(order.id);
                  const canFeedback = order.status === "completed" && !hasFeedback;
                  return (
                    <div
                      key={order.id}
                      className="rounded-xl p-5 space-y-3 transition-all hover:border-[#C9A84C]/20"
                      style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}
                    >
                      <div className="flex items-start justify-between flex-wrap gap-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <OrderStatusIcon status={order.status} />
                            <p className="text-sm font-medium text-white">
                              {order.gatewayOrderId ?? `Order #${order.id}`}
                            </p>
                          </div>
                          <p className="text-xs text-gray-500 pl-6">
                            {format(new Date(order.createdAt), "MMM dd, yyyy · HH:mm")}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-white">
                            ${(order.amount / 100).toFixed(2)}{" "}
                            <span className="text-xs text-gray-500 font-normal">{order.currency}</span>
                          </span>
                          <OrderStatusBadge status={order.status} />
                        </div>
                      </div>

                      {/* Feedback CTA or Already Submitted */}
                      {order.status === "completed" && (
                        <div
                          className="rounded-lg px-4 py-3 flex items-center justify-between"
                          style={{
                            background: hasFeedback
                              ? "rgba(201,168,76,0.04)"
                              : "rgba(201,168,76,0.06)",
                            border: hasFeedback
                              ? "1px solid rgba(201,168,76,0.1)"
                              : "1px dashed rgba(201,168,76,0.25)",
                          }}
                        >
                          {hasFeedback ? (
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                              <span className="text-xs text-gray-400">Feedback submitted</span>
                              <StarDisplay
                                rating={
                                  (feedbackList.find((f: any) => f.orderId === order.id) as any)?.rating ?? 0
                                }
                              />
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-2">
                                <MessageSquare className="h-3.5 w-3.5 text-[#C9A84C]" />
                                <span className="text-xs text-gray-300">
                                  How was your experience?
                                </span>
                              </div>
                              <button
                                onClick={() => {
                                  setFeedbackOrder({ id: order.id, plan: order.gatewayOrderId });
                                  setFeedbackOpen(true);
                                }}
                                className="text-xs font-semibold text-[#C9A84C] hover:text-[#D4B85C] transition-colors flex items-center gap-1"
                              >
                                Leave Feedback <ChevronRight className="h-3 w-3" />
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* SUBSCRIPTIONS TAB */}
          {activeTab === "subscriptions" && (
            <div className="space-y-3">
              {subscriptions.length === 0 ? (
                <EmptyState
                  icon={CreditCard}
                  title="No subscriptions"
                  desc="Subscribe to a plan to get ongoing premium support."
                  cta="View Plans"
                  onCta={() => setLocation("/checkout")}
                />
              ) : (
                subscriptions.map((sub: any) => (
                  <div
                    key={sub.id}
                    className="rounded-xl p-5 transition-all hover:border-[#C9A84C]/20"
                    style={{
                      background: "#0a0a0a",
                      border: sub.status === "active"
                        ? "1px solid rgba(201,168,76,0.15)"
                        : "1px solid #1a1a1a",
                    }}
                  >
                    <div className="flex items-start justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
                          style={{
                            background:
                              sub.status === "active"
                                ? "rgba(201,168,76,0.12)"
                                : "rgba(255,255,255,0.04)",
                            border:
                              sub.status === "active"
                                ? "1px solid rgba(201,168,76,0.3)"
                                : "1px solid #222",
                          }}
                        >
                          <Crown
                            className="h-4 w-4"
                            style={{ color: sub.status === "active" ? "#C9A84C" : "#555" }}
                          />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">{sub.planId}</p>
                          <p className="text-xs text-gray-500">
                            Started {format(new Date(sub.createdAt), "MMM dd, yyyy")}
                          </p>
                        </div>
                      </div>
                      <SubStatusBadge status={sub.status} />
                    </div>
                    {sub.currentPeriodEnd && (
                      <p className="text-xs text-gray-600 mt-3 pl-13">
                        Renews {format(new Date(sub.currentPeriodEnd), "MMM dd, yyyy")}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* FEEDBACK TAB */}
          {activeTab === "feedback" && (
            <div className="space-y-3">
              {feedbackList.length === 0 ? (
                <EmptyState
                  icon={Star}
                  title="No feedback yet"
                  desc="After your order is delivered, you can share your experience here."
                />
              ) : (
                feedbackList.map((fb: any) => (
                  <div
                    key={fb.id}
                    className="rounded-xl p-5 space-y-3 transition-all hover:border-[#C9A84C]/20"
                    style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}
                  >
                    <div className="flex items-start justify-between flex-wrap gap-2">
                      <StarDisplay rating={fb.rating} />
                      <span className="text-xs text-gray-500">
                        {format(new Date(fb.createdAt), "MMM dd, yyyy")}
                      </span>
                    </div>
                    {fb.comment && (
                      <p className="text-sm text-gray-300 leading-relaxed">"{fb.comment}"</p>
                    )}
                    {fb.orderId && (
                      <p className="text-xs text-gray-600">Order #{fb.orderId}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Feedback Dialog ── */}
      <FeedbackDialog
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
        orderId={feedbackOrder?.id}
        planName={feedbackOrder?.plan}
        onSuccess={() => {
          refetchOrders();
          refetchFeedback();
        }}
      />
    </div>
  );
}

// ─── Reusable Empty State ─────────────────────────────────────────────────────

function EmptyState({
  icon: Icon,
  title,
  desc,
  cta,
  onCta,
}: {
  icon: React.ElementType;
  title: string;
  desc: string;
  cta?: string;
  onCta?: () => void;
}) {
  return (
    <div
      className="rounded-xl p-12 text-center"
      style={{ background: "#0a0a0a", border: "1px dashed #1f1f1f" }}
    >
      <Icon className="h-12 w-12 mx-auto mb-4 text-gray-700" />
      <p className="text-gray-300 font-medium mb-1">{title}</p>
      <p className="text-sm text-gray-500 max-w-xs mx-auto">{desc}</p>
      {cta && onCta && (
        <button
          onClick={onCta}
          className="mt-5 text-sm text-[#C9A84C] hover:text-[#D4B85C] hover:underline transition-colors"
        >
          {cta} →
        </button>
      )}
    </div>
  );
}
