import { Trophy, Users, MapPin, BarChart3, Star, Shield, Zap } from "lucide-react";

const features = [
  {
    icon: MapPin,
    title: "Book Turfs Instantly",
    desc: "Find and book cricket turfs near you in seconds. Real-time availability, transparent pricing.",
    color: "text-orange-400",
    bg: "bg-orange-400/10",
  },
  {
    icon: Users,
    title: "Find Players",
    desc: "Need players for your match? Post a listing and connect with cricketers in your city.",
    color: "text-blue-400",
    bg: "bg-blue-400/10",
  },
  {
    icon: Trophy,
    title: "Create & Join Teams",
    desc: "Build your own cricket team, manage rosters, and challenge others to matches.",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
  },
  {
    icon: BarChart3,
    title: "Track Your Stats",
    desc: "Keep a detailed record of runs, wickets, averages, and all your cricket achievements.",
    color: "text-purple-400",
    bg: "bg-purple-400/10",
  },
  {
    icon: Shield,
    title: "Verified Turfs",
    desc: "Every turf on our platform is admin-verified for quality and authenticity.",
    color: "text-rose-400",
    bg: "bg-rose-400/10",
  },
  {
    icon: Zap,
    title: "Live Scorecard",
    desc: "Record match scores live and share results with your community instantly.",
    color: "text-yellow-400",
    bg: "bg-yellow-400/10",
  },
];

const steps = [
  { n: "01", title: "Download the App", desc: "Get Glory Sports on your Android or iOS device for free." },
  { n: "02", title: "Create Your Profile", desc: "Set up your player profile with your city, preferred role, and stats." },
  { n: "03", title: "Book a Turf or Find Players", desc: "Browse verified turfs near you or post a need-players listing." },
  { n: "04", title: "Play & Track", desc: "Log your match, record scores, and build your cricket legacy." },
];

export default function Home() {
  return (
    <div className="bg-[#0F172A] text-white">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#F97316]/20 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-24 md:py-36 text-center">
          <div className="inline-flex items-center gap-2 bg-[#F97316]/10 border border-[#F97316]/30 rounded-full px-4 py-1.5 text-sm text-[#F97316] mb-8">
            <Star className="h-3.5 w-3.5" />
            India's #1 Cricket Platform
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black leading-tight tracking-tight mb-6">
            Play Cricket.<br />
            <span className="text-[#F97316]">Build Legends.</span>
          </h1>
          <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            Find players, book turfs, manage your team, and track every run and wicket — all in one free app built for Indian cricketers.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://play.google.com/store"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-[#F97316] hover:bg-[#F97316]/90 text-white font-semibold px-8 py-3.5 rounded-xl transition-colors"
            >
              Get on Google Play
            </a>
            <a
              href="https://apps.apple.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-white font-semibold px-8 py-3.5 rounded-xl border border-white/20 transition-colors"
            >
              Download on App Store
            </a>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-y border-white/10 bg-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { v: "50,000+", l: "Players" },
            { v: "1,200+", l: "Verified Turfs" },
            { v: "30+", l: "Cities" },
            { v: "2.5L+", l: "Matches Played" },
          ].map((s) => (
            <div key={s.l}>
              <div className="text-3xl font-black text-[#F97316]">{s.v}</div>
              <div className="text-slate-400 text-sm mt-1">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-24">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-black">Everything You Need to Play</h2>
          <p className="text-slate-400 mt-3 text-lg">Built ground-up for the Indian cricket community.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div key={f.title} className="bg-[#1E293B] border border-white/10 rounded-2xl p-6 hover:border-[#F97316]/30 transition-colors">
              <div className={`w-12 h-12 rounded-xl ${f.bg} flex items-center justify-center mb-4`}>
                <f.icon className={`h-6 w-6 ${f.color}`} />
              </div>
              <h3 className="font-bold text-lg mb-2">{f.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-[#1E293B]/50 border-y border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-24">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-black">How It Works</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((s) => (
              <div key={s.n} className="text-center">
                <div className="text-5xl font-black text-[#F97316]/30 mb-3">{s.n}</div>
                <h3 className="font-bold text-lg mb-2">{s.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-24 text-center">
        <h2 className="text-3xl md:text-4xl font-black mb-4">Ready to Play Your Best Cricket?</h2>
        <p className="text-slate-400 text-lg mb-10">Join lakhs of cricketers across India on Glory Sports.</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="https://play.google.com/store"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center bg-[#F97316] hover:bg-[#F97316]/90 text-white font-semibold px-10 py-3.5 rounded-xl transition-colors"
          >
            Download Free — Android
          </a>
          <a
            href="https://apps.apple.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center bg-white/10 hover:bg-white/15 text-white font-semibold px-10 py-3.5 rounded-xl border border-white/20 transition-colors"
          >
            Download Free — iOS
          </a>
        </div>
      </section>
    </div>
  );
}
