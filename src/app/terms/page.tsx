import React from "react";
import { Metadata } from "next";
import { termsAndConditions } from "@/constants";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "Terms and Conditions - Edges Network",
  description:
    "Read the Terms and Conditions for Edges Network, Nigeria's trusted platform for cheap data and airtime.",
};

export default function Terms() {
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

      // Handle multiple phone numbers
      const phoneRegex = /\+234\d{10}/g;
      const matches = [...trimmedLine.matchAll(phoneRegex)];

      if (matches.length > 0) {
        const segments: (string | JSX.Element)[] = [];
        let lastIndex = 0;

        matches.forEach((match, i) => {
          const start = match.index!;
          const end = start + match[0].length;

          // Add text before the match
          if (start > lastIndex) {
            segments.push(trimmedLine.slice(lastIndex, start));
          }

          // Add clickable phone
          segments.push(
            <a
              key={`phone-${index}-${i}`}
              href={`https://wa.me/${match[0].replace("+", "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-green-400 hover:text-green-300"
            >
              {match[0]}
            </a>
          );

          lastIndex = end;
        });

        // Add any trailing text after last match
        if (lastIndex < trimmedLine.length) {
          segments.push(trimmedLine.slice(lastIndex));
        }

        return (
          <p
            key={index}
            className="text-xs leading-5 text-justify mb-2 text-gray-300"
          >
            {segments}
          </p>
        );
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
      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="max-h-screen">
          {renderFormattedText(termsAndConditions)}
        </div>
      </main>
    </div>
  );
}
