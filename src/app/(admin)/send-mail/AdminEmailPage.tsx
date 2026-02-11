// app/(admin)/send-mail/AdminEmailPage.tsx
"use client";

import { useState, useTransition } from "react";
import { sendAdminEmailAction } from "@/app/actions/admin-emails";
import { FaPaperPlane, FaEnvelope } from "react-icons/fa6";
import { IoCheckmarkCircle, IoAlertCircle } from "react-icons/io5";

export default function AdminEmailPage() {
  const [names, setNames] = useState(""); // new: comma-separated names
  const [isPending, startTransition] = useTransition();
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sendAsHtml, setSendAsHtml] = useState(true);
  const [result, setResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleSend = async () => {
    if (!to.trim() || !subject.trim() || !message.trim()) {
      setResult({ type: "error", message: "All fields are required" });
      return;
    }

    setResult(null);

    startTransition(async () => {
      const formData = new FormData();
      formData.append("to", to);
      formData.append("names", names.trim()); // ← new
      formData.append("subject", subject);
      formData.append("message", message);
      if (sendAsHtml) formData.append("sendAsHtml", "on");

      const res = await sendAdminEmailAction(formData);

      if (res.error) {
        setResult({ type: "error", message: res.error });
      } else {
        setResult({ type: "success", message: res.message! });
        // Clear form
        setTo("");
        setSubject("");
        setMessage("");
      }
    });
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-gradient-to-br from-[#D7A77F]/20 to-[#D7A77F]/5 rounded-xl border border-[#D7A77F]/30">
            <FaEnvelope size={28} className="text-[#D7A77F]" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Send Email</h1>
            <p className="text-gray-400">Admin email broadcast tool</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl p-8">
          <div className="space-y-6">
            {/* To */}
            <div>
              <label className="block text-gray-400 text-sm mb-2">
                To (comma separated)
              </label>
              <input
                type="text"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="user@example.com, another@email.com"
                className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white focus:border-[#D7A77F] focus:outline-none"
                disabled={isPending}
              />
              <p className="text-xs text-gray-500 mt-1">
                Supports multiple emails separated by commas
              </p>
            </div>

            {/* NEW: Names (optional) */}
            <div>
              <label className="block text-gray-400 text-sm mb-2">
                Recipient Names (optional, comma separated, same order)
              </label>
              <input
                type="text"
                value={names}
                onChange={(e) => setNames(e.target.value)}
                placeholder="John Doe, Jane Smith"
                className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white placeholder-gray-500 focus:border-[#D7A77F] ..."
                disabled={isPending}
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave empty for generic "Hello," greeting
              </p>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-gray-400 text-sm mb-2">
                Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Important update from the team"
                className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white focus:border-[#D7A77F] focus:outline-none"
                disabled={isPending}
              />
            </div>

            {/* Message */}
            <div>
              <label className="block text-gray-400 text-sm mb-2">
                Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write your message here..."
                rows={12}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white focus:border-[#D7A77F] focus:outline-none resize-y"
                disabled={isPending}
              />
            </div>

            {/* HTML toggle */}
            <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={sendAsHtml}
                onChange={(e) => setSendAsHtml(e.target.checked)}
                className="w-4 h-4 accent-[#D7A77F]"
              />
              Send as formatted HTML (recommended)
            </label>

            {/* Result */}
            {result && (
              <div
                className={`p-4 rounded-lg border flex items-start gap-3 ${result.type === "success" ? "bg-green-500/10 border-green-500" : "bg-red-500/10 border-red-500"}`}
              >
                {result.type === "success" ? (
                  <IoCheckmarkCircle size={24} className="text-green-500" />
                ) : (
                  <IoAlertCircle size={24} className="text-red-500" />
                )}
                <p
                  className={
                    result.type === "success"
                      ? "text-green-500"
                      : "text-red-500"
                  }
                >
                  {result.message}
                </p>
              </div>
            )}

            {/* Send Button */}
            <button
              onClick={handleSend}
              disabled={
                isPending || !to.trim() || !subject.trim() || !message.trim()
              }
              className="w-full bg-[#D7A77F] hover:bg-[#c09670] text-black font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {isPending ? (
                <>Sending...</>
              ) : (
                <>
                  <FaPaperPlane /> Send Email
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
