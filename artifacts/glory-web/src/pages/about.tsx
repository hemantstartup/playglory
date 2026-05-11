import { Trophy, Target, Heart, Users } from "lucide-react";

const values = [
  { icon: Trophy, label: "Cricket First", desc: "Every decision we make is guided by what's best for the Indian cricket community." },
  { icon: Target, label: "Transparency", desc: "We believe in honest pricing, verified turfs, and no hidden fees — ever." },
  { icon: Heart, label: "Community", desc: "Cricket thrives on community. We exist to strengthen bonds between players across cities." },
  { icon: Users, label: "Inclusivity", desc: "Whether you're a weekend player or a serious club cricketer, Glory Sports is built for you." },
];

const team = [
  { role: "Founder & CEO", desc: "Passionate cricketer who wanted to simplify turf booking and player discovery in India." },
  { role: "Head of Product", desc: "Focused on building an intuitive experience for players and turf owners alike." },
  { role: "Technology Lead", desc: "Building the infrastructure that powers real-time bookings and live scorecards." },
];

export default function About() {
  return (
    <div className="bg-[#0F172A] text-white">
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-24 text-center">
        <div className="w-16 h-16 bg-[#F97316]/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Trophy className="h-8 w-8 text-[#F97316]" />
        </div>
        <h1 className="text-4xl md:text-5xl font-black mb-6">About Glory Sports</h1>
        <p className="text-slate-400 text-lg leading-relaxed">
          Glory Sports is India's premier cricket ecosystem — a platform built to connect players, turf owners, and cricket enthusiasts
          across the country. We believe cricket is more than a sport; it's a way of life for millions of Indians.
        </p>
      </section>

      <section className="bg-[#1E293B]/50 border-y border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="text-[#F97316] font-semibold text-sm mb-3 uppercase tracking-wider">Our Mission</div>
            <h2 className="text-3xl font-black mb-5">Making Cricket Accessible for Every Indian</h2>
            <p className="text-slate-400 leading-relaxed">
              We started Glory Sports with a single question: why is it so hard to find a good cricket turf, connect with other players,
              and keep track of your cricket journey? Our mission is to solve exactly that.
            </p>
            <p className="text-slate-400 leading-relaxed mt-4">
              We're building the infrastructure that lets any cricketer — from Surat to Shillong — find a turf, form a team,
              and track their stats with ease.
            </p>
          </div>
          <div className="bg-[#1E293B] rounded-2xl border border-white/10 p-8">
            <div className="text-5xl font-black text-[#F97316] mb-2">2024</div>
            <div className="text-slate-400 mb-6 text-sm">Founded in India, built for India</div>
            <div className="space-y-4">
              {[
                { v: "50,000+", l: "Registered Players" },
                { v: "1,200+", l: "Verified Turfs" },
                { v: "30+", l: "Cities Covered" },
              ].map((s) => (
                <div key={s.l} className="flex justify-between border-b border-white/10 pb-3">
                  <span className="text-slate-400 text-sm">{s.l}</span>
                  <span className="font-bold text-[#F97316]">{s.v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-24">
        <h2 className="text-3xl font-black text-center mb-12">Our Values</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {values.map((v) => (
            <div key={v.label} className="bg-[#1E293B] border border-white/10 rounded-2xl p-6 text-center">
              <div className="w-12 h-12 bg-[#F97316]/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <v.icon className="h-6 w-6 text-[#F97316]" />
              </div>
              <h3 className="font-bold text-lg mb-2">{v.label}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[#1E293B]/50 border-t border-white/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-24 text-center">
          <h2 className="text-3xl font-black mb-3">The Team Behind Glory Sports</h2>
          <p className="text-slate-400 mb-12">Cricketers building for cricketers.</p>
          <div className="grid sm:grid-cols-3 gap-8">
            {team.map((m) => (
              <div key={m.role} className="bg-[#0F172A] border border-white/10 rounded-2xl p-6">
                <div className="w-14 h-14 rounded-full bg-[#F97316]/10 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-black text-[#F97316]">{m.role.charAt(0)}</span>
                </div>
                <div className="font-bold mb-2">{m.role}</div>
                <p className="text-slate-400 text-sm leading-relaxed">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
