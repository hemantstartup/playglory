const EFFECTIVE_DATE = "January 1, 2025";

const sections = [
  {
    title: "1. Information We Collect",
    items: [
      {
        sub: "1.1 Information You Provide",
        text: "When you create an account, we collect: your name, phone number, and optional email address; city and location preferences; profile photo (optional); cricket statistics and match records you submit; team information and membership data; and payment information for turf bookings (processed securely through third-party payment providers).",
      },
      {
        sub: "1.2 Automatically Collected Information",
        text: "When you use our app, we automatically collect: device identifiers (device ID, OS version, app version); usage data (features accessed, time spent, crash reports); location data (only when you grant permission, used to find nearby turfs); and log data (IP address, timestamps, in-app actions).",
      },
      {
        sub: "1.3 Information from Third Parties",
        text: "We may receive information from payment processors and analytics partners, solely for operating and improving the Services.",
      },
    ],
  },
  {
    title: "2. How We Use Your Information",
    items: [
      {
        sub: "",
        text: "We use collected data to: provide, operate, and maintain the Glory Sports platform; process turf bookings and payments; connect players for match coordination; display cricket statistics and team records; send notifications about bookings and platform updates; improve and personalise your experience; detect and prevent fraud; and comply with applicable Indian law.",
      },
    ],
  },
  {
    title: "3. Sharing of Information",
    items: [
      {
        sub: "",
        text: "We do not sell your personal information. We may share it with: other users, as necessary for team coordination and bookings; turf owners, to fulfil booking requests; service providers (payment processors, cloud infrastructure) under confidentiality agreements; law enforcement when required by law; and business successors in a merger or acquisition.",
      },
    ],
  },
  {
    title: "4. Data Storage and Security",
    items: [
      {
        sub: "",
        text: "Your data is stored on secure servers in India. We implement industry-standard technical and organisational measures — including encryption in transit (TLS/HTTPS) and at rest — to protect your information. No internet transmission is 100% secure.",
      },
    ],
  },
  {
    title: "5. Your Rights and Choices",
    items: [
      {
        sub: "",
        text: "You have the right to: access and review your personal information; correct inaccuracies via your profile settings; delete your account and data by emailing privacy@glorysports.in; opt out of marketing at any time; and withdraw location permission via device settings. Requests are processed within 30 days.",
      },
    ],
  },
  {
    title: "6. Location Data",
    items: [
      {
        sub: "",
        text: "We request location access only to show nearby turfs and players. Location is optional — the app works without it, though proximity-based search is unavailable. We do not share your precise location with third parties except as needed for the Services.",
      },
    ],
  },
  {
    title: "7. Children's Privacy",
    items: [
      {
        sub: "",
        text: "Glory Sports is not directed to children under 13. We do not knowingly collect personal data from children under 13. If you believe a child under 13 has provided us data, please contact privacy@glorysports.in and we will delete it promptly.",
      },
    ],
  },
  {
    title: "8. Third-Party Links",
    items: [
      {
        sub: "",
        text: "Our app may link to third-party services (e.g. payment gateways). This policy does not apply to those services. We encourage you to review their privacy policies.",
      },
    ],
  },
  {
    title: "9. Changes to This Policy",
    items: [
      {
        sub: "",
        text: "We may update this policy from time to time. Significant changes will be notified via the app or email. Continued use after the effective date constitutes acceptance.",
      },
    ],
  },
  {
    title: "10. Contact Us",
    items: [
      {
        sub: "",
        text: "Privacy team: privacy@glorysports.in\nPostal Address: Glory Sports, [Registered Address], India\n\nWe respond within 30 days.",
      },
    ],
  },
];

export default function Privacy() {
  return (
    <div className="bg-[#0F172A] text-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <div className="mb-10 pb-8 border-b border-white/10">
          <div className="text-[#F97316] font-semibold text-sm uppercase tracking-wider mb-3">Legal</div>
          <h1 className="text-4xl font-black mb-3">Privacy Policy</h1>
          <div className="text-slate-400 text-sm">Effective Date: {EFFECTIVE_DATE}</div>
        </div>

        <div className="bg-[#1E293B]/50 border border-white/10 rounded-xl p-5 mb-10 text-sm text-slate-300 leading-relaxed">
          <strong className="text-white">Overview:</strong> Glory Sports ("we", "us", "our") is committed to protecting your privacy. This
          Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and
          related services. By using the Services, you agree to the collection and use of information described here.
        </div>

        <div className="space-y-10">
          {sections.map((s) => (
            <section key={s.title}>
              <h2 className="text-xl font-bold mb-4 text-[#F97316]">{s.title}</h2>
              <div className="space-y-4">
                {s.items.map((item, i) => (
                  <div key={i}>
                    {item.sub && <div className="font-semibold text-white mb-2">{item.sub}</div>}
                    <p className="text-slate-400 leading-relaxed text-sm whitespace-pre-line">{item.text}</p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
