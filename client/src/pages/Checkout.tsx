import { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Check, Sparkles } from "lucide-react";
import ContactForm from "@/components/ContactForm";
import { trpc } from "@/lib/trpc";

const PLANS = [
  { id: "spark", name: "Spark Starter", price: 799, desc: "For early-stage brands needing a polished launchpad." },
  { id: "growth", name: "Business Booster", price: 1599, desc: "Our most popular — advanced motion and SEO baked in." },
  { id: "boost", name: "Growth Accelerator", price: 1999, desc: "Enterprise-grade experience with bespoke integrations." },
];

const COUPONS: Record<string, number> = {
  LUMINA10: 0.1,
  VIP20: 0.2,
};

export default function Checkout() {
  const [selected, setSelected] = useState<string>("growth");
  const [coupon, setCoupon] = useState("");
  const [applied, setApplied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const createOrder = trpc.payments.createOrder.useMutation();

  useEffect(() => {
    const src = "https://checkout.infinity.com/v1/checkout.js";
    if (document.querySelector(`script[src="${src}"]`)) return;
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    document.body.appendChild(script);
  }, []);

  const plan = useMemo(() => PLANS.find(p => p.id === selected) ?? PLANS[1], [selected]);
  const discountRate = applied ? COUPONS[applied] ?? 0 : 0;
  const subtotal = plan.price;
  const discount = Math.round(subtotal * discountRate * 100) / 100;
  const total = Math.max(0, Math.round((subtotal - discount) * 100) / 100);

  const applyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    const code = coupon.trim().toUpperCase();
    if (!code) return;
    if (!COUPONS[code]) {
      setError("That code isn’t valid. Try LUMINA10 or VIP20.");
      setApplied(null);
      return;
    }
    setApplied(code);
    setError(null);
  };

  return (
    <div className="page-fade min-h-screen bg-gradient-to-br from-[#050505] via-[#0b0b0b] to-[#0f0c05] text-white py-14">
      <div className="max-w-6xl mx-auto px-6 space-y-10">
        <header className="flex flex-col gap-3">
          <p className="text-xs uppercase tracking-[0.3em] text-gray-500">LuminaWeave Checkout</p>
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-[#C9A84C]" />
            <h1 className="text-3xl md:text-4xl font-semibold">Lock in your launch with our gold-on-obsidian flow.</h1>
          </div>
          <p className="text-gray-400 text-sm max-w-2xl">
            Choose a plan, add a coupon, and leave the rest to us. Same cinematic palette, zero friction.
          </p>
        </header>

        <div className="grid md:grid-cols-2 gap-8">
          <Card className="bg-[#0a0a0a] border border-[#1a1a1a]">
            <CardHeader>
              <CardTitle className="text-white">Select your experience</CardTitle>
              <CardDescription className="text-gray-400">
                Every plan includes responsive build, performance tuning, and concierge onboarding.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <RadioGroup value={selected} onValueChange={setSelected} className="space-y-4">
                {PLANS.map(p => (
                  <label
                    key={p.id}
                    className={`flex items-start gap-4 p-4 rounded-xl border transition-colors cursor-pointer ${
                      selected === p.id
                        ? "border-[#C9A84C]/70 bg-[#C9A84C]/10"
                        : "border-[#1f1f1f] hover:border-[#C9A84C]/30"
                    }`}
                  >
                    <RadioGroupItem value={p.id} className="mt-1 border-[#C9A84C]/60 text-[#C9A84C]" />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-lg font-semibold text-white">{p.name}</p>
                        {p.id === "growth" && (
                          <span className="text-xs uppercase tracking-[0.2em] bg-[#C9A84C] text-[#050505] px-2 py-0.5 rounded-full">
                            Popular
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400">{p.desc}</p>
                      <p className="text-xl font-semibold text-[#C9A84C]">${p.price}</p>
                    </div>
                  </label>
                ))}
              </RadioGroup>

              <Separator className="bg-[#1f1f1f]" />

              <form onSubmit={applyCoupon} className="flex flex-col gap-3">
                <div className="space-y-2">
                  <Label className="text-sm text-gray-300">Coupon</Label>
                  <div className="flex gap-2">
                    <Input
                      value={coupon}
                      onChange={e => setCoupon(e.target.value)}
                      placeholder="Code goes here"
                      className="bg-[#111] border-[#1f1f1f] text-white placeholder:text-gray-600"
                    />
                    <Button type="submit" className="bg-[#C9A84C] text-[#050505] hover:bg-[#D4B85C]">
                      Apply
                    </Button>
                  </div>
                  {error && <p className="text-sm text-red-400">{error}</p>}
                  {applied && !error && (
                    <p className="text-sm text-[#C9A84C] flex items-center gap-2">
                      <Check className="h-4 w-4" /> {applied} applied — {COUPONS[applied] * 100}% off
                    </p>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="bg-[#0a0a0a] border border-[#1a1a1a]">
            <CardHeader>
              <CardTitle className="text-white">Secure your slot</CardTitle>
              <CardDescription className="text-gray-400">
                We’ll confirm within one business day. No payment collected here — just intent.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
          <div className="rounded-lg border border-[#1f1f1f] bg-[#0f0f0f] p-4 space-y-3">
            <div className="flex items-center justify-between text-sm text-gray-300">
              <span>Plan</span>
              <span className="text-[#C9A84C] font-semibold">{plan.name}</span>
            </div>
                <div className="flex items-center justify-between text-sm text-gray-300">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-300">
                  <span>Discount</span>
                  <span className={discount > 0 ? "text-[#C9A84C]" : ""}>-{discount.toFixed(2)}</span>
                </div>
                <Separator className="bg-[#1f1f1f]" />
            <div className="flex items-center justify-between text-base font-semibold text-white">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>

          <Button
            disabled={paying || createOrder.isPending}
            onClick={async () => {
              try {
                setPaying(true);
                const { keyId, orderId, amount, currency } = await createOrder.mutateAsync({ 
                  plan: plan.name as any, 
                  idempotencyKey: crypto.randomUUID() 
                });
                const infinity = new (window as any).Infinity({
                  key: keyId,
                  amount,
                  currency,
                  name: "LuminaWeave",
                  description: `${plan.name} - ${currency} ${(amount / 100).toFixed(2)}`,
                  order_id: orderId,
                  prefill: {
                    email: "weavelumina@gmail.com",
                    name: plan.name,
                  },
                  notes: { plan: plan.name },
                  theme: { color: "#C9A84C" },
                });
                infinity.open();
              } catch (err: any) {
                setError(err?.message ?? "Payment init failed");
              } finally {
                setPaying(false);
              }
            }}
            className="w-full bg-[#C9A84C] text-[#050505] hover:bg-[#D4B85C] font-semibold h-11"
          >
            {paying ? "Processing..." : "Pay with Infinity"}
          </Button>

          <ContactForm
            selectedPlan={plan.name}
            onSuccess={() => {
              setCoupon("");
              setApplied(null);
            }}
          />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
