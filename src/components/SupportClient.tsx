"use client";

import { useState } from "react";
import {
  IoChatbubbleOutline,
  IoHelpCircleOutline,
} from "react-icons/io5";

export function SupportClient() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState("");

  const handleWhatsAppContact = () => {
    if (!title || !description) {
      setModalMessage(
        "Hello User,\nPlease first fill in the title and description of your issue, then click on the WhatsApp icon or Submit button."
      );
      setModalVisible(true);
      return;
    }

    const adminWhatsAppNumber = "+2347057517841";
    const message = `Hello, I am User requesting assistance from Edges Network with an issue\nTitle: ${title}\nDescription: ${description}`;
    const whatsappUrl = `https://wa.me/${adminWhatsAppNumber}?text=${encodeURIComponent(
      message
    )}`;

    window.open(whatsappUrl, "_blank");

    // Clear form after sending
    setTitle("");
    setDescription("");
  };

  const handleEmailContact = () => {
    const email = "edgesenterprise@outlook.com";
    const subject = encodeURIComponent(title || "Customer Support Request");
    const body = encodeURIComponent(
      description || "Hello, I need assistance from Edges Network."
    );
    const emailUrl = `mailto:${email}?subject=${subject}&body=${body}`;

    window.location.href = emailUrl;
  };

  const faqs = [
    {
      question: "How do I buy data?",
      answer:
        "Go to the Data section, select your plan, and follow the payment steps.",
    },
    {
      question: "Why is my data not working?",
      answer:
        "Check your network or contact support with your purchase details.",
    },
    {
      question: "How do I track referrals?",
      answer: "Visit the Refer & Earn page to see your referral history.",
    },
  ];

  return (
    <div className="min-h-screen bg-black">
      {/* Main Content */}
      <div className="w-full max-w-4xl mx-auto px-4 py-6 pb-24">
        {/* Hero Card */}
        <div className="bg-gradient-to-br from-gray-900/90 via-gray-800/90 to-gray-900/90 rounded-xl p-6 mb-4 border border-[#D7A77F] shadow-lg backdrop-blur-sm animate-fade-in">
          <h1 className="text-2xl md:text-3xl font-bold text-[#D7A77F] text-center mb-3">
            Need Help?
          </h1>
          <p className="text-sm md:text-base text-gray-300 text-center mb-6 leading-relaxed">
            Submit your issue below or{" "}
            <button
              onClick={handleWhatsAppContact}
              className="text-blue-500 hover:text-blue-400 underline transition-colors"
            >
              contact us on WhatsApp
            </button>
            . Our team at{" "}
            <button
              onClick={handleEmailContact}
              className="text-blue-500 hover:text-blue-400 underline transition-colors"
            >
              edgesnetwork@gmail.com
            </button>{" "}
            will assist you.
          </p>

          {/* Form */}
          <div className="space-y-3">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Issue Title"
              className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 text-sm md:text-base placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D7A77F] transition-all"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your issue"
              rows={5}
              className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 text-sm md:text-base placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D7A77F] resize-none transition-all"
            />
            <button
              onClick={handleWhatsAppContact}
              className="w-full bg-[#744925] hover:bg-[#8B5530] text-white font-semibold rounded-lg px-4 py-3 text-base md:text-lg transition-all duration-300 active:scale-[0.98] animate-pulse-subtle"
            >
              Submit Issue
            </button>
          </div>
        </div>

        {/* FAQ Card */}
        <div className="bg-gradient-to-br from-gray-900/90 via-gray-800/90 to-gray-900/90 rounded-xl p-6 border border-[#D7A77F] shadow-lg backdrop-blur-sm animate-fade-in-delay">
          <div className="flex items-center gap-2 mb-4">
            <IoHelpCircleOutline size={24} className="text-[#D7A77F]" />
            <h2 className="text-lg md:text-xl font-semibold text-white">
              Frequently Asked Questions
            </h2>
          </div>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="px-4 py-3 bg-black/30 rounded-lg hover:bg-black/40 transition-colors"
              >
                <h3 className="text-sm md:text-base font-semibold text-[#D7A77F] mb-2">
                  {faq.question}
                </h3>
                <p className="text-xs md:text-sm text-gray-400 leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Floating WhatsApp Button */}
        <button
          onClick={handleWhatsAppContact}
          className="fixed bottom-16 right-0 -translate-x-1/2 md:left-auto md:right-6 md:translate-x-0 bg-[#25D366] hover:bg-[#20BA5A] text-white rounded-full w-16 h-16 flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 z-50 animate-pulse-whatsapp"
          aria-label="Contact via WhatsApp"
        >
          <IoChatbubbleOutline size={32} className="fill-current" />
        </button>
      </div>

      {/* Modal */}
      {modalVisible && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] px-4 animate-fade-in">
          <div className="bg-gray-900 rounded-xl p-6 max-w-sm w-full border border-[#D7A77F] shadow-2xl animate-scale-in">
            <p className="text-white text-sm md:text-base text-center mb-6 whitespace-pre-line leading-relaxed">
              {modalMessage}
            </p>
            <button
              onClick={() => setModalVisible(false)}
              className="w-full bg-[#744925] hover:bg-[#8B5530] text-white font-semibold rounded-lg px-4 py-2.5 text-sm md:text-base transition-all duration-200 active:scale-95"
            >
              OK
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fade-in-delay {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes pulse-subtle {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.02);
          }
        }

        @keyframes pulse-whatsapp {
          0%,
          100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(37, 211, 102, 0.7);
          }
          50% {
            transform: scale(1.05);
            box-shadow: 0 0 0 10px rgba(37, 211, 102, 0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
        }

        .animate-fade-in-delay {
          animation: fade-in-delay 0.5s ease-out 0.2s forwards;
          opacity: 0;
        }

        .animate-scale-in {
          animation: scale-in 0.3s ease-out forwards;
        }

        .animate-pulse-subtle {
          animation: pulse-subtle 2s ease-in-out infinite;
        }

        .animate-pulse-whatsapp {
          animation: pulse-whatsapp 2s ease-in-out infinite;
        }

        /* Smooth scrolling */
        html {
          scroll-behavior: smooth;
        }

        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
        }

        ::-webkit-scrollbar-track {
          background: #000;
        }

        ::-webkit-scrollbar-thumb {
          background: #333;
          border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: #555;
        }

        /* Responsive text sizing */
        @media (max-width: 640px) {
          .text-sm {
            font-size: 0.875rem;
          }
        }

        /* Tablet optimizations */
        @media (min-width: 768px) and (max-width: 1024px) {
          /* Add tablet-specific styles if needed */
        }

        /* Desktop optimizations */
        @media (min-width: 1024px) {
          /* Add desktop-specific styles if needed */
        }

        /* Reduce motion for accessibility */
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }

        /* Focus visible for keyboard navigation */
        *:focus-visible {
          outline: 2px solid #d7a77f;
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
}
