import React from "react";
import { Metadata } from 'next'; // Add this import
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const Contact = () => {
  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-[#D7A77F] mb-6">Contact Us</h1>
        <p className="text-gray-400">
          Reach out to us at{" "}
          <a
            href="mailto:support@edgesnetwork.com"
            className="text-[#D7A77F] hover:underline"
          >
            support@edgesnetwork.com
          </a>{" "}
          or use our contact form below.
        </p>
        {/* Add a contact form or other content here */}
      </main>
      <Footer />
    </div>
  );
};

export default Contact;

export const metadata: Metadata = {
  title: "Contact Us - Edges Network",
  description: "Get in touch with Edges Network for support or inquiries.",
};
