import { useState } from "react";
import { Mail, Phone, MapPin, Clock, Send, CheckCircle } from "lucide-react";

const channels = [
  { icon: Mail, label: "Email Support", value: "support@glorysports.in", sub: "We reply within 24 hours", href: "mailto:support@glorysports.in", color: "text-blue-400", bg: "bg-blue-400/10" },
  { icon: Phone, label: "Phone Support", value: "+91 98765 43210", sub: "Mon–Sat, 9 AM – 6 PM IST", href: "tel:+919876543210", color: "text-emerald-400", bg: "bg-emerald-400/10" },
  { icon: MapPin, label: "Head Office", value: "Ahmedabad, Gujarat", sub: "Visit by appointment only", href: null, color: "text-orange-400", bg: "bg-orange-400/10" },
  { icon: Clock, label: "Support Hours", value: "Mon – Sat", sub: "9:00 AM – 6:00 PM IST", href: null, color: "text-purple-400", bg: "bg-purple-400/10" },
];

const topics = ["Booking issue", "Account problem", "Turf listing inquiry", "Payment / refund", "Bug report", "Partnership", "Other"];

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", topic: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => { setLoading(false); setSubmitted(true); }, 1200);
  };

  return (
    <div className="bg-[#0F172A] text-white">
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-20 text-center">
        <div className="text-[#F97316] font-semibold text-sm uppercase tracking-wider mb-3">Get in Touch</div>
        <h1 className="text-4xl md:text-5xl font-black mb-5">Contact Us</h1>
        <p className="text-slate-400 text-lg">Have a question, feedback, or need help? Our team is here for you.</p>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {channels.map((c) => (
            <div
              key={c.label}
              className={`bg-[#1E293B] border border-white/10 rounded-2xl p-5 transition-colors ${c.href ? "hover:border-white/20 cursor-pointer" : ""}`}
              onClick={() => c.href && window.open(c.href)}
            >
              <div className={`w-11 h-11 rounded-xl ${c.bg} flex items-center justify-center mb-4`}>
                <c.icon className={`h-5 w-5 ${c.color}`} />
              </div>
              <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">{c.label}</div>
              <div className="font-semibold text-white mb-1">{c.value}</div>
              <div className="text-xs text-slate-400">{c.sub}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-24">
        <div className="bg-[#1E293B] border border-white/10 rounded-2xl p-8">
          {submitted ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-emerald-400/10 rounded-full flex items-center justify-center mx-auto mb-5">
                <CheckCircle className="h-8 w-8 text-emerald-400" />
              </div>
              <h2 className="text-2xl font-bold mb-3">Message Sent!</h2>
              <p className="text-slate-400">
                Thanks for reaching out. Our team will get back to you within 24 hours.
              </p>
              <button
                className="mt-8 text-[#F97316] text-sm hover:underline"
                onClick={() => { setSubmitted(false); setForm({ name: "", email: "", phone: "", topic: "", message: "" }); }}
              >
                Send another message
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold mb-6">Send Us a Message</h2>
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Your Name *</label>
                    <input
                      type="text" required placeholder="Rahul Sharma" value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full bg-[#0F172A] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-[#F97316]/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Phone Number *</label>
                    <input
                      type="tel" required placeholder="+91 98765 43210" value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="w-full bg-[#0F172A] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-[#F97316]/50"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Email Address</label>
                  <input
                    type="email" placeholder="rahul@example.com" value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full bg-[#0F172A] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-[#F97316]/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Topic *</label>
                  <select
                    required value={form.topic}
                    onChange={(e) => setForm({ ...form, topic: e.target.value })}
                    className="w-full bg-[#0F172A] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#F97316]/50"
                  >
                    <option value="">Select a topic...</option>
                    {topics.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Message *</label>
                  <textarea
                    required rows={5} placeholder="Describe your issue or question in detail..." value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className="w-full bg-[#0F172A] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-[#F97316]/50 resize-none"
                  />
                </div>
                <button
                  type="submit" disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-[#F97316] hover:bg-[#F97316]/90 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors"
                >
                  {loading ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Send className="h-4 w-4" />}
                  {loading ? "Sending..." : "Send Message"}
                </button>
              </form>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
