// app/layout.tsx
import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import { getCountryConfig } from "@/config/countries";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Telcos - Best Platform for Data Bundles & Airtime",
  description:
    "Get the best data bundles, discounted airtime, instant utility payments, and affordable WAEC/NECO pins. Save up to 60% with instant delivery.",
  keywords:
    "Telcos, cheap data, discounted airtime, MTN data bundles, Airtel data, Glo data, 9mobile data, utility payments, WAEC pins, NECO pins, NABTEB pins, electricity bills payment, cable TV subscription, ",
  authors: [{ name: "Telcos" }],
  creator: "Telcos",
  publisher: "Telcos",
  robots:
    "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
  openGraph: {
    type: "website",
    locale: "en_NG",
    url: "https://edges-landing-page.vercel.app/",
    title: "Telcos - Best Platform for Data Bundles & Airtime",
    description:
      "Save money on data bundles, airtime, and utility bills. Trusted by thousands for the best prices and instant delivery. Cheapest Data, Airtime & Utility Platform",
    siteName: "Telcos",
    images: [
      {
        url: "https://edges-landing-page.vercel.app/og-image.png",
        width: 1200,
        height: 630,
        alt: "Telcos - Best Platform for Data Bundles & Airtime",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Telcos - Best Platform for Data Bundles & Airtime",
    description:
      "Get up to 60% discount on data bundles and airtime across all networks. Instant delivery guaranteed! Cheapest Data, Airtime & Utility Platform",
    images: ["https://edges-landing-page.vercel.app/og-image.png"],
    creator: "@edgesnetwork",
  },
  alternates: {
    canonical: "https://edges-landing-page.vercel.app/",
  },
  icons: {
    icon: "/og-image.png",
    apple: "/og-image.png",
  },
  other: {
    "geo.region": "NG",
    "geo.country": "Nigeria",
    "geo.placename": "Nigeria",
    ICBM: "9.0579,8.6753",
    "DC.title": "Telcos - Best Platform for Data Bundles & Airtime",
    "DC.creator": "Telcos",
    "DC.subject": "Data bundles, Airtime, Utility payments",
    "DC.description":
      "Best most trusted platform for data bundles and discounted airtime. Best Platform for Data Bundles & Airtime. Cheapest Data, Airtime & Utility Platform",
    classification: "Business",
    coverage: "Worldwide",
    distribution: "Global",
    rating: "General",
    contactphone: "+2347057517841",
    contactemail: "edgesenterprise@outlook.com",
  },
};

export const viewport: Viewport = {
  themeColor: "#d7a77f",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // ✅ Get country from headers for language/direction
  const headersList = await headers();
  const countryCode = headersList.get("x-country") || "ng";
  const config = getCountryConfig(countryCode);

  return (
    <html lang={config.language.code} dir={config.language.direction}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}

        {/* ✅ Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "Telcos",
              alternateName:
                "Telcos - Best Platform for Data Bundles & Airtime",
              description:
                "Best Platform for Data Bundles & Airtime, discounted airtime, utility payments, and educational pins. The leading platform for cheap data bundles",
              url: "https://edges-landing-page.vercel.app/",
              logo: "https://edges-landing-page.vercel.app/og-image.png",
              image: "https://edges-landing-page.vercel.app/hero.png",
              telephone: "+2347057517841",
              email: "edgesnetwork@gmail.com",
              address: {
                "@type": "PostalAddress",
                addressCountry: "NG",
                addressRegion: "Nigeria",
              },
              areaServed: { "@type": "Country", name: "Nigeria" },
              sameAs: [
                "https://twitter.com/edges_network",
                "https://instagram.com/official_edgesnetwork",
                "https://tiktok.com/@edgesnetwork113",
              ],
              hasOfferCatalog: {
                "@type": "OfferCatalog",
                name: "Data Bundles and Airtime Services",
                itemListElement: [
                  {
                    "@type": "Offer",
                    itemOffered: {
                      "@type": "Service",
                      name: "MTN Data Bundles",
                      description:
                        "Discounted MTN data plans with instant delivery",
                      areaServed: "Nigeria",
                    },
                  },
                  {
                    "@type": "Offer",
                    itemOffered: {
                      "@type": "Service",
                      name: "Airtel Data Bundles",
                      description: "Cheap Airtel data bundles for all devices",
                      areaServed: "Nigeria",
                    },
                  },
                  {
                    "@type": "Offer",
                    itemOffered: {
                      "@type": "Service",
                      name: "Glo Data Bundles",
                      description: "Cheap Glo data bundles for all devices",
                      areaServed: "Nigeria",
                    },
                  },
                  {
                    "@type": "Offer",
                    itemOffered: {
                      "@type": "Service",
                      name: "9Mobile Data Bundles",
                      description: "Cheap 9Mobile data bundles for all devices",
                      areaServed: "Nigeria",
                    },
                  },
                  {
                    "@type": "Offer",
                    itemOffered: {
                      "@type": "Service",
                      name: "Discounted Airtime",
                      description:
                        "Airtime top-up at discounted rates for all networks",
                      areaServed: "Nigeria",
                    },
                  },
                ],
              },
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: "4.8",
                reviewCount: "2500",
                bestRating: "5",
              },
            }),
          }}
        />
      </body>
    </html>
  );
}

// // app/layout.tsx
// import type { Metadata, Viewport } from "next";
// import { Geist, Geist_Mono } from "next/font/google";
// import "./globals.css";

// const geistSans = Geist({
//   variable: "--font-geist-sans",
//   subsets: ["latin"],
// });

// const geistMono = Geist_Mono({
//   variable: "--font-geist-mono",
//   subsets: ["latin"],
// });

// export const metadata: Metadata = {
//   title: "Telcos - Best Platform for Data Bundles & Airtime",
//   description:
//     "Get the best data bundles, discounted airtime, instant utility payments, and affordable WAEC/NECO pins. Save up to 60% with instant delivery.",
//   keywords:
//     "Telcos, cheap data, discounted airtime, MTN data bundles, Airtel data, Glo data, 9mobile data, utility payments, WAEC pins, NECO pins, NABTEB pins, electricity bills payment, cable TV subscription, ",
//   authors: [{ name: "Telcos" }],
//   creator: "Telcos",
//   publisher: "Telcos",
//   robots:
//     "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
//   openGraph: {
//     type: "website",
//     locale: "en_NG",
//     url: "https://edges-landing-page.vercel.app/",
//     title: "Telcos - Best Platform for Data Bundles & Airtime",
//     description:
//       "Save money on data bundles, airtime, and utility bills. Trusted by thousands for the best prices and instant delivery. Cheapest Data, Airtime & Utility Platform",
//     siteName: "Telcos",
//     images: [
//       {
//         url: "https://edges-landing-page.vercel.app/og-image.png",
//         width: 1200,
//         height: 630,
//         alt: "Telcos - Best Platform for Data Bundles & Airtime",
//       },
//     ],
//   },
//   twitter: {
//     card: "summary_large_image",
//     title: "Telcos - Best Platform for Data Bundles & Airtime",
//     description:
//       "Get up to 60% discount on data bundles and airtime across all networks. Instant delivery guaranteed! Cheapest Data, Airtime & Utility Platform",
//     images: ["https://edges-landing-page.vercel.app/og-image.png"],
//     creator: "@edgesnetwork",
//   },
//   alternates: {
//     canonical: "https://edges-landing-page.vercel.app/",
//   },
//   icons: {
//     icon: "/og-image.png",
//     apple: "/og-image.png",
//   },
//   // themeColor removed from here
//   other: {
//     "geo.region": "NG",
//     "geo.country": "Nigeria",
//     "geo.placename": "Nigeria",
//     ICBM: "9.0579,8.6753",
//     "DC.title":
//       "Telcos - Best Platform for Data Bundles & Airtime",
//     "DC.creator": "Telcos",
//     "DC.subject": "Data bundles, Airtime, Utility payments",
//     "DC.description":
//       "Best most trusted platform for data bundles and discounted airtime. Best Platform for Data Bundles & Airtime. Cheapest Data, Airtime & Utility Platform",
//     classification: "Business",
//     coverage: "Worldwide",
//     distribution: "Global",
//     rating: "General",
//     contactphone: "+2347057517841",
//     contactemail: "edgesenterprise@outlook.com",
//   },
// };

// // Add this new export for themeColor (and other viewport options if needed)
// export const viewport: Viewport = {
//   themeColor: "#d7a77f",
// };

// export default async function RootLayout({
//   children,
// }: {
//   children: React.ReactNode;
// }) {
//   return (
//     <html lang="en-NG">
//       <body
//         className={`${geistSans.variable} ${geistMono.variable} antialiased`}
//       >
//         {children}

//         {/* ✅ Place structured data inside body to avoid hydration mismatch */}
//         <script
//           type="application/ld+json"
//           dangerouslySetInnerHTML={{
//             __html: JSON.stringify({
//               "@context": "https://schema.org",
//               "@type": "Organization",
//               name: "Telcos",
//               alternateName: "Telcos - Best Platform for Data Bundles & Airtime",
//               description:
//                 "Best Platform for Data Bundles & Airtime, discounted airtime, utility payments, and educational pins. The leading platform for cheap data bundles",
//               url: "https://edges-landing-page.vercel.app/",
//               logo: "https://edges-landing-page.vercel.app/og-image.png",
//               image: "https://edges-landing-page.vercel.app/hero.png",
//               telephone: "+2347057517841",
//               email: "edgesnetwork@gmail.com",
//               address: {
//                 "@type": "PostalAddress",
//                 addressCountry: "NG",
//                 addressRegion: "Nigeria",
//               },
//               areaServed: { "@type": "Country", name: "Nigeria" },
//               sameAs: [
//                 "https://twitter.com/edges_network",
//                 "https://instagram.com/official_edgesnetwork",
//                 "https://tiktok.com/@edgesnetwork113",
//               ],
//               hasOfferCatalog: {
//                 "@type": "OfferCatalog",
//                 name: "Data Bundles and Airtime Services",
//                 itemListElement: [
//                   {
//                     "@type": "Offer",
//                     itemOffered: {
//                       "@type": "Service",
//                       name: "MTN Data Bundles",
//                       description:
//                         "Discounted MTN data plans with instant delivery",
//                       areaServed: "Nigeria",
//                     },
//                   },
//                   {
//                     "@type": "Offer",
//                     itemOffered: {
//                       "@type": "Service",
//                       name: "Airtel Data Bundles",
//                       description: "Cheap Airtel data bundles for all devices",
//                       areaServed: "Nigeria",
//                     },
//                   },
//                   {
//                     "@type": "Offer",
//                     itemOffered: {
//                       "@type": "Service",
//                       name: "Glo Data Bundles",
//                       description: "Cheap Glo data bundles for all devices",
//                       areaServed: "Nigeria",
//                     },
//                   },
//                   {
//                     "@type": "Offer",
//                     itemOffered: {
//                       "@type": "Service",
//                       name: "9Mobile Data Bundles",
//                       description: "Cheap 9Mobile data bundles for all devices",
//                       areaServed: "Nigeria",
//                     },
//                   },
//                   {
//                     "@type": "Offer",
//                     itemOffered: {
//                       "@type": "Service",
//                       name: "Discounted Airtime",
//                       description:
//                         "Airtime top-up at discounted rates for all networks",
//                       areaServed: "Nigeria",
//                     },
//                   },
//                 ],
//               },
//               aggregateRating: {
//                 "@type": "AggregateRating",
//                 ratingValue: "4.8",
//                 reviewCount: "2500",
//                 bestRating: "5",
//               },
//             }),
//           }}
//         />
//       </body>
//     </html>
//   );
// }
