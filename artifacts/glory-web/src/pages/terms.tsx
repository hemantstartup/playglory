const EFFECTIVE_DATE = "January 1, 2025";

const sections = [
  {
    title: "1. Acceptance of Terms",
    text: 'By downloading, installing, or using the Glory Sports application or website ("Services"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Services. We reserve the right to update these Terms at any time; continued use constitutes acceptance.',
  },
  {
    title: "2. Eligibility",
    text: "You must be at least 13 years old to use the Services. Users under 18 should use the Services only with parental or guardian consent. We may terminate accounts of users who provide false age information.",
  },
  {
    title: "3. Account Registration",
    text: "To access most features, you must create an account using a valid Indian mobile number. You are responsible for maintaining the confidentiality of your credentials and all activities under your account. Notify us immediately of unauthorised use at support@glorysports.in.",
  },
  {
    title: "4. Acceptable Use",
    text: "You agree NOT to: violate applicable Indian law; impersonate any person or entity; submit false information about turfs, matches, or statistics; engage in harassment or discriminatory behaviour; use bots or automated scripts; or interfere with the platform's operation.",
  },
  {
    title: "5. Turf Bookings",
    text: "Bookings are subject to availability and turf owner confirmation. By booking, you agree to pay in full, honour the booking or cancel within the specified window, and comply with the turf owner's rules. Glory Sports is a platform facilitating bookings; we are not responsible for turf quality or safety. Report disputes to support@glorysports.in.",
  },
  {
    title: "6. Cancellations and Refunds",
    text: "Cancellations more than 24 hours before booking time are generally eligible for a full refund. Cancellations within 24 hours may incur a fee per the turf owner's policy. No-shows are not eligible for refunds. Refunds are processed within 5-7 business days to the original payment method.",
  },
  {
    title: "7. User Content",
    text: "You retain ownership of content you submit (match records, posts, profiles). By submitting, you grant Glory Sports a non-exclusive, worldwide, royalty-free licence to display and distribute it within the Services. We may remove content that violates these Terms.",
  },
  {
    title: "8. Payments and Fees",
    text: "Payments are processed through third-party providers. Glory Sports does not store full payment card information. All prices are in Indian Rupees (INR). We are not liable for payment failures caused by your bank or payment provider.",
  },
  {
    title: "9. Intellectual Property",
    text: "All content other than User Content — including our design, logo, software, and data — is owned by or licensed to Glory Sports and protected by applicable intellectual property laws. You may not copy or reproduce it without our written consent.",
  },
  {
    title: "10. Disclaimers",
    text: 'THE SERVICES ARE PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. WE DO NOT WARRANT UNINTERRUPTED, ERROR-FREE SERVICE OR THE ACCURACY OF USER-SUBMITTED CONTENT. USE IS AT YOUR OWN RISK.',
  },
  {
    title: "11. Limitation of Liability",
    text: "TO THE MAXIMUM EXTENT PERMITTED BY LAW, GLORY SPORTS SHALL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE 12 MONTHS PRECEDING THE CLAIM.",
  },
  {
    title: "12. Governing Law",
    text: "These Terms are governed by the laws of India. Disputes shall be subject to the exclusive jurisdiction of the courts in India. We encourage you to contact support@glorysports.in first to resolve disputes amicably.",
  },
  {
    title: "13. Termination",
    text: "We may suspend or terminate your account at our discretion, with or without notice, for conduct violating these Terms. Upon termination, your right to use the Services ceases immediately.",
  },
  {
    title: "14. Changes to Terms",
    text: "We may modify these Terms at any time. Material changes will be notified via the app or email. Continued use after the effective date constitutes acceptance of the revised Terms.",
  },
  {
    title: "15. Contact",
    text: "For questions: legal@glorysports.in\nPostal Address: Glory Sports, [Registered Address], India",
  },
];

export default function Terms() {
  return (
    <div className="bg-[#0F172A] text-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <div className="mb-10 pb-8 border-b border-white/10">
          <div className="text-[#F97316] font-semibold text-sm uppercase tracking-wider mb-3">Legal</div>
          <h1 className="text-4xl font-black mb-3">Terms of Service</h1>
          <div className="text-slate-400 text-sm">Effective Date: {EFFECTIVE_DATE}</div>
        </div>

        <div className="bg-[#1E293B]/50 border border-white/10 rounded-xl p-5 mb-10 text-sm text-slate-300 leading-relaxed">
          <strong className="text-white">Please read carefully.</strong> By accessing or using Glory Sports, you agree to these Terms of
          Service and our Privacy Policy.
        </div>

        <div className="space-y-10">
          {sections.map((s) => (
            <section key={s.title}>
              <h2 className="text-xl font-bold mb-3 text-[#F97316]">{s.title}</h2>
              <p className="text-slate-400 leading-relaxed text-sm whitespace-pre-line">{s.text}</p>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
