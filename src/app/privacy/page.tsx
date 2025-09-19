import React from "react";
import { Metadata } from "next";
import { privacyPolicy } from "@/constants";
import Header from "@/components/Header";


export const metadata: Metadata = {
  title: "Privacy Policy - Edges Network",
  description:
    "Read the Privacy Policy for Edges Network, Nigeria's trusted platform for cheap data and airtime.",
};

export default function Privacy() {
  const renderFormattedText = (text: string) => {
    const lines = text.trim().split("\n");

    return lines.map((line, index) => {
      const trimmedLine = line.trim();

      // Render section titles (like "1. Consent")
      if (/^\d+\.\s/.test(trimmedLine) || index === 0) {
        return (
          <p key={index} className="text-xl font-bold text-gray-300 mb-4">
            {trimmedLine}
          </p>
        );
      }

      // Render email as a clickable link
      if (trimmedLine.includes("edgesenterprise@outlook.com")) {
        const parts = trimmedLine.split("edgesenterprise@outlook.com");
        return (
          <p key={index} className="text-xs text-gray-300 mb-2">
            {parts[0]}
            <a
              href="mailto:edgesenterprise@outlook.com"
              className="underline text-blue-400 hover:text-blue-300"
            >
              edgesenterprise@outlook.com
            </a>
            {parts[1]}
          </p>
        );
      }

      // Render phone numbers as WhatsApp links
      if (trimmedLine.match(/\+234\d{10}/g)) {
        const phones = trimmedLine.match(/\+234\d{10}/g);
        if (phones && phones[0]) {
          const parts = trimmedLine.split(phones[0]);

          return (
            <p
              key={index}
              className="text-xs leading-5 text-justify text-gray-300 mb-2"
            >
              {parts[0]}
              <a
                href={`https://wa.me/${phones[0].replace("+", "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-gray-300 hover:text-white"
              >
                {phones[0]}
              </a>
              {parts[1] || ""}
            </p>
          );
        }
      }

      // Default paragraph
      return (
        <p
          key={index}
          className="text-xs leading-5 text-justify text-gray-300 mb-1"
        >
          {trimmedLine}
        </p>
      );
    });
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      <main className="max-w-4xl justify-center mx-auto px-4 py-6">
        <div className=" max-h-screen">
          {renderFormattedText(privacyPolicy)}
        </div>
      </main>
    </div>
  );
}
