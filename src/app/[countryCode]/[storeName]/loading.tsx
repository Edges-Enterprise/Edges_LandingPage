// src/app/[countryCode]/[storeName]/loading.tsx
export default function StoreLoading() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        gap: "1.5rem",
        padding: "2rem",
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          border: "4px solid var(--border)",
          borderTop: "4px solid var(--brand-color)",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
        }}
      />
      <p style={{ color: "var(--muted)", fontSize: "0.95rem", margin: 0 }}>
        Loading store...
      </p>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
