import { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Sparkles } from "lucide-react";
import ContactForm from "@/components/ContactForm";
import { trpc } from "@/lib/trpc";
import { supabase } from "@/lib/supabase";

const PLANS = [
  { id: "spark", name: "Spark Starter", price: 799, desc: "The Essentials. Perfect for testing a new idea without overspending." },
  { id: "growth", name: "Business Booster", price: 1599, desc: "The Profit Engine. Includes everything you need to rank on Google and convert visitors into cash. (Best Value)" },
  { id: "boost", name: "Growth Accelerator", price: 1999, desc: "Market Domination. For established brands ready to scale aggressively." },
];



export default function Checkout() {
  const [selected, setSelected] = useState<string>("growth");
  // Coupon logic
  const [coupon, setCoupon] = useState("");
  const [applied, setApplied] = useState<string | null>(null);
  const COUPONS: Record<string, number> = {
    LUMINA10: 0.1,
    VIP20: 0.2,
  };
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  // No trpc payments router, so handle order creation directly below

  useEffect(() => {
    const src = "https://checkout.infinity.com/v1/checkout.js";
    if (document.querySelector(`script[src="${src}"]`)) return;
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    document.body.appendChild(script);
  }, []);

  const plan = useMemo(() => PLANS.find(p => p.id === selected) ?? PLANS[1], [selected]);
  const subtotal = plan.price;
  const discountRate = applied ? COUPONS[applied] ?? 0 : 0;
  const discount = Math.round(subtotal * discountRate * 100) / 100;
  const processingFee = 0.99;
  const total = Math.max(0, Math.round((subtotal - discount + processingFee) * 100) / 100);



  return (
    <div className="page-fade min-h-screen bg-gradient-to-br from-[#050505] via-[#0b0b0b] to-[#0f0c05] text-white py-14">
      <div className="max-w-6xl mx-auto px-6 space-y-10">
        <header className="flex flex-col gap-3">
          <p className="text-xs uppercase tracking-[0.3em] text-gray-500">LuminaWeave Checkout</p>
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-[#C9A84C]" />
            <h1 className="text-3xl md:text-4xl font-semibold">Get Your High-Converting Website Live in 7 Days.</h1>
          </div>
          <p className="text-gray-400 text-sm max-w-2xl">
            Select your investment below. Your design team starts working the moment you book your slot.
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
              {/* Coupon input */}
              <form
                onSubmit={e => {
                  e.preventDefault();
                  const code = coupon.trim().toUpperCase();
                  if (!COUPONS[code]) {
                    setError("That code isn’t valid. Try LUMINA10 or VIP20.");
                    setApplied(null);
                    return;
                  }
                  setApplied(code);
                  setError(null);
                }}
                className="flex flex-col gap-2 mb-4"
              >
                <Label className="text-sm text-gray-300">Coupon</Label>
                <div className="flex gap-2">
                  <Input
                    value={coupon}
                    onChange={e => setCoupon(e.target.value)}
                    placeholder="Enter coupon code"
                    className="bg-[#111] border-[#1f1f1f] text-white placeholder:text-gray-600"
                  />
                  <Button type="submit" className="bg-[#C9A84C] text-[#050505] hover:bg-[#D4B85C]">Apply</Button>
                </div>
                {applied && !error && (
                  <p className="text-sm text-[#C9A84C]">{applied} applied — {COUPONS[applied] * 100}% off</p>
                )}
                {error && <p className="text-sm text-red-400">{error}</p>}
              </form>

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
                <div className="flex items-center justify-between text-sm text-gray-300">
                  <span>Processing Fee</span>
                  <span>${processingFee.toFixed(2)}</span>
                </div>
                <Separator className="bg-[#1f1f1f]" />
                <div className="flex items-center justify-between text-base font-semibold text-white">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>

              {/* Simple, outcome-focused form */}
              <form
                onSubmit={async e => {
                  e.preventDefault();
                  try {
                    setPaying(true);
                    // Simulate order creation and payment intent
                    // Browser-safe UUID fallback
                    const orderId = typeof crypto !== 'undefined' && crypto.randomUUID
                      ? crypto.randomUUID()
                      : ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
                          (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
                        );
                    // Replace with real email from form
                    const email = (e.target as any).elements[0].value;
                    const { error: supabaseError } = await supabase
                      .from('orders')
                      .insert([
                        {
                          plan: plan.name,
                          subtotal,
                          discount,
                          processing_fee: processingFee,
                          total,
                          order_id: orderId,
                          email,
                          coupon: applied,
                        }
                      ]);
                    if (supabaseError) {
                      setError("Order saved, but failed to sync with Supabase: " + supabaseError.message);
                      return;
                    }
                    // Simulate payment intent (replace with real payment integration)
                    alert("Order placed! We'll contact you soon to confirm your slot.");
                  } catch (err: any) {
                    setError(err?.message ?? "Order failed");
                  } finally {
                    setPaying(false);
                  }
                }}
                className="flex flex-col gap-4 mt-6"
              >
                <Label className="text-sm text-gray-300">Your best email (for delivery & updates)</Label>
                <Input
                  type="email"
                  required
                  placeholder="you@email.com"
                  className="bg-[#111] border-[#1f1f1f] text-white placeholder:text-gray-600"
                />
                {error && <p className="text-sm text-red-400">{error}</p>}
                <Button
                  type="submit"
                  disabled={paying}
                  className="w-full bg-[#C9A84C] text-[#050505] hover:bg-[#D4B85C] font-semibold h-11 mt-2"
                >
                  {paying ? "Securing your slot..." : "Secure My Slot Now"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Removed duplicate payment area and button, handled above */}
        </div>
      </div>
    </div>
  );
}
