import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Trophy, Menu, X } from "lucide-react";

const links = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/support", label: "Support" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms" },
];

export function Nav() {
  const [open, setOpen] = useState(false);
  const [location] = useLocation();

  return (
    <header className="sticky top-0 z-50 bg-[#0F172A]/95 backdrop-blur border-b border-white/10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-white">
          <div className="w-8 h-8 bg-[#F97316] rounded-lg flex items-center justify-center">
            <Trophy className="h-5 w-5 text-white" />
          </div>
          <span>Glory Sports</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                location === l.href
                  ? "text-[#F97316] bg-[#F97316]/10"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <button
          className="md:hidden text-slate-400 hover:text-white"
          onClick={() => setOpen(!open)}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden bg-[#0F172A] border-t border-white/10 px-4 py-3 flex flex-col gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                location === l.href
                  ? "text-[#F97316] bg-[#F97316]/10"
                  : "text-slate-400 hover:text-white"
              }`}
              onClick={() => setOpen(false)}
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-[#0F172A] border-t border-white/10 mt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 font-bold text-xl text-white mb-3">
              <div className="w-8 h-8 bg-[#F97316] rounded-lg flex items-center justify-center">
                <Trophy className="h-5 w-5 text-white" />
              </div>
              Glory Sports
            </div>
            <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
              India's premier cricket platform. Find players, book turfs, track stats, and compete — all in one app.
            </p>
          </div>
          <div>
            <div className="text-white font-semibold mb-3">Company</div>
            <div className="flex flex-col gap-2">
              {[
                { href: "/about", label: "About Us" },
                { href: "/contact", label: "Contact" },
                { href: "/support", label: "Support" },
              ].map((l) => (
                <Link key={l.href} href={l.href} className="text-slate-400 hover:text-white text-sm transition-colors">
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <div className="text-white font-semibold mb-3">Legal</div>
            <div className="flex flex-col gap-2">
              {[
                { href: "/privacy", label: "Privacy Policy" },
                { href: "/terms", label: "Terms of Service" },
              ].map((l) => (
                <Link key={l.href} href={l.href} className="text-slate-400 hover:text-white text-sm transition-colors">
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 mt-10 pt-6 text-center text-slate-500 text-sm">
          © {year} Glory Sports. All rights reserved. Made with ❤️ for cricket lovers in India.
        </div>
      </div>
    </footer>
  );
}
