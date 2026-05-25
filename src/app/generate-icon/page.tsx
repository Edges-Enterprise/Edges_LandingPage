// app/generate-icon/page.tsx
"use client";

import { useState } from "react";
import { generateIconPng } from "@/app/reseller/generateIcon";

export default function GenerateIconPage() {
  const [loading, setLoading] = useState(false);

  const generateIcon = async (storeName: string, brandColor: string) => {
    setLoading(true);
    try {
      const blob = await generateIconPng(storeName, brandColor);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${storeName}-icon.png`;
      a.click();
      URL.revokeObjectURL(url);
      alert(`${storeName} icon downloaded!`);
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: "20px", textAlign: "center" }}>
      <h1>Generate Store Icons</h1>
      <div
        style={{
          display: "flex",
          gap: "20px",
          justifyContent: "center",
          marginTop: "40px",
        }}
      >
        <button
          onClick={() => generateIcon("tip", "#111827")}
          disabled={loading}
          style={{
            padding: "15px 30px",
            fontSize: "16px",
            cursor: "pointer",
            background: "#111827",
            color: "white",
            border: "none",
            borderRadius: "8px",
          }}
        >
          Generate Tip Icon
        </button>
        <button
          onClick={() => generateIcon("steve", "#2563EB")}
          disabled={loading}
          style={{
            padding: "15px 30px",
            fontSize: "16px",
            cursor: "pointer",
            background: "#2563EB",
            color: "white",
            border: "none",
            borderRadius: "8px",
          }}
        >
          Generate Steve Icon
        </button>
      </div>
      {loading && (
        <p style={{ marginTop: "20px" }}>Generating... Please wait...</p>
      )}
    </div>
  );
}
