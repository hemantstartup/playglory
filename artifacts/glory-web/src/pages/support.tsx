import { useState } from "react";
import { Link } from "wouter";
import { ChevronDown, ChevronUp, BookOpen, CreditCard, Users, MapPin, Trophy, Mail } from "lucide-react";

const categories = [
  {
    icon: MapPin, label: "Turf Bookings", color: "text-orange-400", bg: "bg-orange-400/10",
    faqs: [
      { q: "How do I book a turf on Glory Sports?", a: "Open the app, tap 'Turfs', browse or search near your city, select your date and time slot, and complete payment. You'll receive instant confirmation." },
      { q: "Can I cancel a booking?", a: "Yes. Go to 'My Bookings' and tap 'Cancel'. Cancellations more than 24 hours before the slot are eligible for a full refund. Late cancellations may incur a fee per the turf's policy." },
      { q: "What happens if a turf cancels my booking?", a: "You'll receive a full automatic refund within 5–7 business days and an immediate notification." },
      { q: "How do I know a turf is genuine?", a: "All turfs are admin-verified before listing. Look for the 'Verified' badge. You can also read reviews from other players." },
    ],
  },
  {
    icon: CreditCard, label: "Payments & Refunds", color: "text-blue-400", bg: "bg-blue-400/10",
    faqs: [
      { q: "What payment methods are accepted?", a: "We accept UPI (GPay, PhonePe, Paytm), debit/credit cards (Visa, Mastercard, RuPay), and net banking. All payments are processed securely via Razorpay." },
      { q: "How long do refunds take?", a: "Refunds are processed within 5–7 business days. UPI refunds are typically faster (1–3 days)." },
      { q: "My payment failed but money was deducted. What do I do?", a: "The amount will auto-refund within 5–7 business days. Email support@glorysports.in with your transaction ID for faster resolution." },
    ],
  },
  {
    icon: Users, label: "Players & Teams", color: "text-emerald-400", bg: "bg-emerald-400/10",
    faqs: [
      { q: "How do I create a team?", a: "Go to 'Teams' in the app and tap 'Create Team'. Fill in your team name, city, and logo. You'll become the captain and can invite players." },
      { q: "How do I find players for my match?", a: "Use the 'Need Players' feed. Browse existing posts or create your own listing with how many players you need, city, and match date." },
      { q: "Can I be in multiple teams?", a: "Yes, you can be a member of multiple teams simultaneously. Manage memberships from your profile." },
    ],
  },
  {
    icon: Trophy, label: "Matches & Stats", color: "text-purple-400", bg: "bg-purple-400/10",
    faqs: [
      { q: "How do I record a match?", a: "Only team captains can create a match. Go to 'Matches', select your team and opponent, set the details. Both captains must verify the final score." },
      { q: "What if the opponent captain doesn't verify?", a: "If they don't verify within 48 hours, the match may be marked as disputed. Contact support@glorysports.in for resolution." },
      { q: "Why isn't my stat updating?", a: "Stats update after both captains verify the result. If it hasn't updated within 24 hours of verification, contact support." },
    ],
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/10 last:border-0">
      <button
        className="w-full text-left py-4 flex items-start justify-between gap-4 hover:text-[#F97316] transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span className="font-medium text-sm leading-snug">{q}</span>
        {open
          ? <ChevronUp className="h-4 w-4 shrink-0 mt-0.5 text-[#F97316]" />
          : <ChevronDown className="h-4 w-4 shrink-0 mt-0.5 text-slate-400" />}
      </button>
      {open && <div className="pb-4 text-slate-400 text-sm leading-relaxed -mt-1">{a}</div>}
    </div>
  );
}

export default function Support() {
  const [activeCategory, setActiveCategory] = useState(0);

  return (
    <div className="bg-[#0F172A] text-white">
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-20 text-center">
        <div className="text-[#F97316] font-semibold text-sm uppercase tracking-wider mb-3">Help Center</div>
        <h1 className="text-4xl md:text-5xl font-black mb-5">Support</h1>
        <p className="text-slate-400 text-lg">Find answers to common questions or reach us directly.</p>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16">
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="bg-[#1E293B] border border-white/10 rounded-2xl p-5 text-center">
            <BookOpen className="h-8 w-8 text-[#F97316] mx-auto mb-3" />
            <div className="font-bold mb-1">FAQ</div>
            <p className="text-slate-400 text-sm">Browse answers to the most common questions below.</p>
          </div>
          <Link href="/contact" className="bg-[#1E293B] border border-white/10 rounded-2xl p-5 text-center hover:border-[#F97316]/30 transition-colors block">
            <Mail className="h-8 w-8 text-blue-400 mx-auto mb-3" />
            <div className="font-bold mb-1">Contact Form</div>
            <p className="text-slate-400 text-sm">Send us a message and we'll reply within 24 hours.</p>
          </Link>
          <a href="mailto:support@glorysports.in" className="bg-[#1E293B] border border-white/10 rounded-2xl p-5 text-center hover:border-[#F97316]/30 transition-colors block">
            <Mail className="h-8 w-8 text-emerald-400 mx-auto mb-3" />
            <div className="font-bold mb-1">support@glorysports.in</div>
            <p className="text-slate-400 text-sm">Mon–Sat, 9 AM – 6 PM IST</p>
          </a>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-24">
        <h2 className="text-2xl font-black mb-8">Frequently Asked Questions</h2>
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible shrink-0 lg:w-56">
            {categories.map((c, i) => (
              <button
                key={c.label}
                onClick={() => setActiveCategory(i)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                  activeCategory === i
                    ? "bg-[#F97316]/10 text-[#F97316] border border-[#F97316]/20"
                    : "bg-[#1E293B] text-slate-400 hover:text-white border border-white/10"
                }`}
              >
                <div className={`w-7 h-7 rounded-lg ${c.bg} flex items-center justify-center shrink-0`}>
                  <c.icon className={`h-3.5 w-3.5 ${c.color}`} />
                </div>
                {c.label}
              </button>
            ))}
          </div>
          <div className="flex-1 bg-[#1E293B] border border-white/10 rounded-2xl px-6 py-2">
            {categories[activeCategory].faqs.map((faq) => (
              <FAQItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#1E293B]/50 border-t border-white/10">
        <div className="max-w-xl mx-auto px-4 sm:px-6 py-16 text-center">
          <h2 className="text-2xl font-bold mb-3">Still Need Help?</h2>
          <p className="text-slate-400 mb-8">Our support team is available Monday through Saturday, 9 AM to 6 PM IST.</p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 bg-[#F97316] hover:bg-[#F97316]/90 text-white font-semibold px-8 py-3 rounded-xl transition-colors"
          >
            <Mail className="h-4 w-4" />
            Contact Support
          </Link>
        </div>
      </section>
    </div>
  );
}
