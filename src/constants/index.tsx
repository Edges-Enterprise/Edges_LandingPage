// Social Media Icons

const TwitterIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const TikTokIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
  </svg>
);

const InstagramIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  </svg>
);

const WhatsAppIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488" />
  </svg>
);

export const socialLinks = [
  {
    name: "Twitter",
    icon: TwitterIcon,
    url: "https://twitter.com/edges_network",
  },
  {
    name: "TikTok",
    icon: TikTokIcon,
    url: "https://tiktok.com/@edges_network",
  },
  {
    name: "Instagram",
    icon: InstagramIcon,
    url: "https://instagram.com/official_edgesnetwork",
  },
  {
    name: "WhatsApp",
    icon: WhatsAppIcon,
    url: "https://whatsapp.com/channel/0029VbBMfPHGU3BEpnO42o2a",
  },
];

interface Feature {
  title: string;
  description: string;
  icon: string;
  benefits: string[];
}

export const features: Feature[] = [
  {
    title: "Cheapest Data Bundles",
    description:
      "Get up to 60% discount on data across all Nigerian networks - MTN, Airtel, Glo, and 9mobile.",
    icon: "📶",
    benefits: ["MTN Data", "Airtel Data", "Glo Data", "9mobile Data"],
  },
  {
    title: "Discounted Airtime",
    description:
      "Buy airtime at cheaper rates with instant delivery to any Nigerian phone number.",
    icon: "📞",
    benefits: [
      "Up to 5% discount",
      "Instant delivery",
      "All networks supported",
      "24/7 availability",
    ],
  },
  {
    title: "Fast Utility Payments",
    description:
      "Pay your electricity bills, cable TV subscriptions, and other utilities quickly and securely.",
    icon: "⚡",
    benefits: [
      "PHCN/EEDC bills",
      "DStv/GOtv/StarTimes",
      "WAEC/NECO/NABTEB pins",
      "Instant confirmation",
    ],
  },
  {
    title: "Educational Services",
    description:
      "Get the cheapest WAEC, NECO, and NABTEB result checker pins in Nigeria.",
    icon: "🎓",
    benefits: [
      "WAEC pins",
      "NECO pins",
      "NABTEB pins",
      "Valid and authentic",
    ],
  },
  {
    title: "Secure Transactions",
    description:
      "All transactions are protected with bank-level security and SSL encryption.",
    icon: "🔒",
    benefits: [
      "SSL encryption",
      "Secure payment gateway",
      "Transaction history",
      "Money-back guarantee",
    ],
  },
  {
    title: "24/7 Customer Support",
    description:
      "Get help anytime with our dedicated customer support team via WhatsApp and phone.",
    icon: "🎧",
    benefits: [
      "WhatsApp support",
      "Phone support",
      "Email support",
      "Fast response time",
    ],
  },
];

export const testimonials = [
  {
    name: "Adebayo O.",
    location: "Lagos",
    comment:
      "Best data prices in Nigeria! I save over ₦2,000 monthly with Edges Network.",
  },
  {
    name: "Fatima A.",
    location: "Abuja",
    comment:
      "Fast delivery and excellent customer service. My go-to platform for airtime and data.",
  },
  {
    name: "Chidi M.",
    location: "Port Harcourt",
    comment:
      "Trusted platform! Been using for 2 years, never disappointed. Highly recommended.",
  },
];

export const privacyPolicy = `
Edges Network
Last Updated: July 10, 2025

At Edges Network, developed by Edges Enterprise, your privacy and data protection are of utmost importance to us. This Privacy Policy explains the types of data we collect, how we use it, and your rights regarding your information.
By using our app, you acknowledge and consent to the practices described herein.

1. Consent
By accessing or using the Edges Network mobile application, you agree to this Privacy Policy. If you do not agree with our policies or practices, please do not use the application.

2. Who We Are
Edges Network is a mobile data reselling platform operated by Edges Enterprise, a technology company based in Nigeria. We provide secure, affordable, and fast mobile data services to users across Nigeria.
• 📧 Contact Email: edgesenterprise@outlook.com

3. Information We Collect
We collect personal and technical information to ensure secure transactions and improve your user experience.
a. Personal Information
• UserName
• Phone Number
• Email Address
b. Account and Transaction Information
• Data plan selections and purchase history
• Payment confirmation and status (via Paystack)
• Wallet or top-up activity (if applicable)
c. Device and Usage Information
• Device model and operating system
• Timestamps and frequency of app usage
• Crash logs and app performance data
• General, non-identifiable usage analytics
d. Support and Communication
• When you contact us, we collect message content and any file attachments to resolve your issue effectively.

4. How We Use Your Information
Your information is used to:
• Operate and maintain the Edges Network app
• Process and verify mobile data purchases via Paystack
• Improve app performance and user experience
• Prevent fraud and ensure platform security
• Communicate with you about purchases, updates, or service changes
• Provide responsive customer support

5. Payments and Financial Security
All payments are processed securely through Paystack, a PCI-DSS-compliant payment provider.
Edges Network does not store any card or bank details.

6. Log Files and Technical Data
We may automatically collect technical log data such as:
• IP Address
• Device Type
• Operating System Version
• Time and Date of Usage
This helps with diagnostics, performance monitoring, and improving service reliability.

7. Cookies and Local Storage
While we do not use traditional web cookies, the app may utilize local storage or similar technologies to:
• Remember login sessions
• Save preferences for a smoother user experience

8. Third-Party Services
We collaborate with trusted third-party providers, including:
• Paystack (payment processing)
• API providers (data delivery)
• Analytics providers (for future performance optimization)
Each provider operates under its own privacy policy, and we encourage users to review those separately.

9. Data Protection Rights
We respect your privacy rights under GDPR and other global standards. You have the right to:
• Access: Request a copy of your personal data
• Rectification: Correct inaccurate or incomplete data
• Erasure: Request deletion of your data
• Restriction: Request we limit how we use your data
• Objection: Object to processing under certain conditions
• Portability: Request transfer of your data to another platform
📩 To exercise these rights, contact: edgesenterprise@outlook.com
We respond within 30 days of verified requests.

10. Children’s Privacy
Our services are not intended for children under the age of 13.
We do not knowingly collect personal data from children. If we learn that such data was collected, we will delete it immediately.

11. Updates to This Privacy Policy
We may revise this Privacy Policy periodically to reflect:
• Changes in the app
• Legal or regulatory updates
• Enhancements in data protection practices
You will be notified of major changes via the app or official communication channels.

12. Contact Us
For any privacy-related concerns or questions:
Edges Enterprise
📧 Email: edgesenterprise@outlook.com

© 2025 Edges Network — All Rights Reserved
Developed by Edges Enterprise
`;

export const termsAndConditions = `
Edges Network
Effective Date: July 10, 2025

Welcome to Edges Network, a mobile data reselling platform operated by Edges Enterprise.
These Terms and Conditions govern your access to and use of our mobile application and services.
By accessing or using the platform, you agree to be bound by these Terms.
If you do not agree, do not use our services.

1. About Us
Edges Network is developed and operated by Edges Enterprise, a Nigerian-based technology company offering secure, affordable, and fast mobile data services nationwide.

• 📧 Email: edgesenterprise@outlook.com

• 📱 WhatsApp: +2347057517841 | +2347015888155

2. Acceptance of Terms
By using our platform, you confirm that:
• You are at least 18 years old or have consent from a parent/guardian.
• You have read, understood, and agree to comply with these Terms and our [Privacy Policy].
• You will not use the platform for any unlawful, fraudulent, or unauthorized activities.

3. Description of Services
Edges Network provides users with a seamless way to purchase mobile data bundles via our app.
• Services are currently accessible through a downloadable APK (Google Drive) and will be available on the Google Play Store.
• All payments are processed securely via Paystack.
• A 10% processing fee applies to every deposit to cover operational and transaction costs.

4. Account Registration and Use
By registering an account, you agree to:
• Provide accurate and up-to-date personal information (e.g., username, name, phone number, email).
• Keep your login credentials secure and confidential.
• Accept full responsibility for all activities conducted under your account.

5. Payments and Deposits
• A 10% fee is automatically deducted from deposits.
• We do not store your card or bank details.
• All completed transactions are final and non-refundable.
• Payments are made securely through Paystack.

6. Delivery of Services
• Data bundles are delivered instantly or within a short processing window.
• Delays may occur due to external factors (e.g., network outages).
• Once data is marked as delivered, no refunds, reversals, or compensations will be issued.

7. Prohibited Activities
You agree not to:
• Use the platform for any illegal or unauthorized purpose.
• Resell or redistribute services without written approval.
• Impersonate Edges Network, its team, or other users.
• Upload malicious software or disrupt platform functionality.
• Misrepresent the service or inflate pricing to mislead others.

8. Data Privacy and Security
• We collect only essential data for service delivery (e.g., contact and transaction information).
• All payment data is handled by Paystack, a PCI-DSS-compliant provider.
• Technical and usage data may be collected to improve platform performance.

9. Third-Party Services
We may integrate with third-party providers including:
• Paystack – for secure payment processing
• Telecom APIs – for data delivery
• Analytics tools (future use) – for app monitoring
Each third-party operates under its own terms and privacy policies. We are not liable for their service disruptions but will assist in resolving major issues.

10. Suspension and Termination
We reserve the right to suspend or terminate your account at any time without notice or explanation.
This may result in:
• Loss of wallet balance and access to services.
• Deletion of your account and associated data.
• Withholding of any pending service delivery.
You waive any right to dispute such actions. Continued use of the platform implies full acceptance of this clause.

11. User Liability
You are financially and legally liable for any damage, fraud, or misuse tied to your account. This includes:
• Reputational or financial damage caused to Edges Network or its users.
• Misleading or overpricing our services to other users.
• Operating a resale business without written approval from Edges Enterprise.

12. No Guarantees or Refunds
• All services are provided “as-is” and “as-available”.
• We do not guarantee uninterrupted service or exact delivery times.
• Once a transaction is completed and service is delivered, no refunds or replacements will be issued.

13. Indemnification
You agree to indemnify and hold harmless Edges Enterprise, its affiliates, subsidiaries, sub-subsidiaries and employees against any claims, damages, losses, or legal expenses arising from:
• Your use or misuse of the platform
• Your violation of these Terms
• Your infringement of third-party rights

14. Children’s Privacy
Our platform is not intended for children under 13. We do not knowingly collect data from minors. If such data is identified, it will be permanently deleted.

15. Changes to Terms
We may update these Terms periodically. All updates will be posted in the app or sent via official channels. Continued use of the platform indicates your acceptance of the latest version.

16. Governing Law
These Terms are governed by the laws of the Federal Republic of Nigeria. Any disputes will be handled under the jurisdiction of Nigerian courts.

17. Contact Us
For support or inquiries:
• 📧 Email: edgesenterprise@outlook.com

• 📱 WhatsApp: +2347057517841 | +2347015888155

© 2025 Edges Network — All Rights Reserved
Developed by Edges Enterprise
`;
