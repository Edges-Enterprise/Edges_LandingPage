import type { Metadata } from "next";
import Head from "next/head";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "Edges Network - Nigeria's Cheapest Data, Airtime & Utility Platform",
  description:
    "Get Nigeria's cheapest data bundles (MTN, Airtel, Glo, 9mobile), discounted airtime, instant utility payments, and affordable WAEC/NECO pins. Save up to 60% with instant delivery.",
  keywords:
    "Edges Network, cheap data Nigeria, discounted airtime, MTN data bundles, Airtel data, Glo data, 9mobile data, utility payments Nigeria, WAEC pins, NECO pins, NABTEB pins, electricity bills payment, cable TV subscription, Lagos data vendor, Abuja airtime, Nigerian fintech",
  authors: [{ name: "Edges Network" }],
  creator: "Edges Network",
  publisher: "Edges Network",
  robots:
    "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
  openGraph: {
    type: "website",
    locale: "en_NG",
    url: "https://edges-landing-page.vercel.app/",
    title: "Edges Network - Nigeria's #1 Platform for Cheap Data & Airtime",
    description:
      "Save money on data bundles, airtime, and utility bills. Trusted by thousands of Nigerians for the best prices and instant delivery.",
    siteName: "Edges Network",
    images: [
      {
        url: "https://edges-landing-page.vercel.app/og-image.png",
        width: 1200,
        height: 630,
        alt: "Edges Network - Cheap Data and Airtime Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Edges Network - Cheapest Data & Airtime in Nigeria",
    description:
      "Get up to 60% discount on data bundles and airtime across all networks. Instant delivery guaranteed!",
    images: ["https://edges-landing-page.vercel.app/twitter-image.png"],
    creator: "@edgesnetwork",
  },
  alternates: {
    canonical: "https://edges-landing-page.vercel.app/",
  },
  other: {
    "geo.region": "NG",
    "geo.country": "Nigeria",
    "geo.placename": "Nigeria",
    ICBM: "9.0579,8.6753", // Nigeria coordinates
    "DC.title": "Edges Network - Cheap Data and Airtime Platform",
    "DC.creator": "Edges Network",
    "DC.subject": "Data bundles, Airtime, Utility payments, Nigeria",
    "DC.description":
      "Nigeria's most trusted platform for cheap data bundles and discounted airtime",
    classification: "Business",
    coverage: "Nigeria",
    distribution: "Global",
    rating: "General",
    contactphone: "+2347057517841",
    contactemail: "edgesenterprise@outlook.com",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-NG">
      <head>
        <link rel="icon" type="image/png" href="/edgesnetworkicon.png" />
        <link rel="apple-touch-icon" href="/edgesnetworkicon.png" />
        <meta name="theme-color" content="#d7a77f" />
        <meta name="msapplication-TileColor" content="d7a77f" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        {/* Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "Edges Network",
              alternateName: "Edges Network Nigeria",
              description:
                "Nigeria's leading platform for cheap data bundles, discounted airtime, utility payments, and educational pins",
              url: "https://edges-landing-page.vercel.app/",
              logo: "https://edges-landing-page.vercel.app/edgesnetworkicon.png",
              image: "https://edges-landing-page.vercel.app/hero.png",
              telephone: "+2347057517841",
              email: "edgesenterprise@outlook.com",
              address: {
                "@type": "PostalAddress",
                addressCountry: "NG",
                addressRegion: "Nigeria",
              },
              areaServed: {
                "@type": "Country",
                name: "Nigeria",
              },
              sameAs: [
                "https://twitter.com/edges_network",
                "https://instagram.com/official_edgesnetwork",
                "https://tiktok.com/@edges_network",
              ],
              hasOfferCatalog: {
                "@type": "OfferCatalog",
                name: "Data and Airtime Services",
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

        {/* Local Business Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "LocalBusiness",
              name: "Edges Network",
              description:
                "Cheapest data bundles and airtime vendor in Nigeria",
              url: "https://edges-landing-page.vercel.app/",
              telephone: "+2347057517841",
              email: "edgesenterprise@outlook.com",
              address: {
                "@type": "PostalAddress",
                addressCountry: "NG",
              },
              openingHoursSpecification: {
                "@type": "OpeningHoursSpecification",
                dayOfWeek: [
                  "Monday",
                  "Tuesday",
                  "Wednesday",
                  "Thursday",
                  "Friday",
                  "Saturday",
                  "Sunday",
                ],
                opens: "00:00",
                closes: "23:59",
              },
              priceRange: "₦50 - ₦50000",
            }),
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
