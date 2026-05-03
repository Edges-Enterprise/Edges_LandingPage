"use client";

const footerLinks = [
  "Privacy Policy",
  "Terms of Service",
  "Contact",
  "Support",
];

export default function Footer() {
  return (
    <footer
      style={{
        borderTop: "1px solid var(--border)",
        padding: "2.2rem 5%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "1rem",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: 6,
            background: "linear-gradient(135deg, #C98A54, #8A5429)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              color: "#FDF8F3",
              fontSize: 12,
              fontWeight: 700,
              fontFamily: "'Playfair Display', serif",
            }}
          >
            E
          </span>
        </div>
        <span style={{ fontSize: "0.85rem", color: "var(--dim)" }}>
          © 2025 Edges Network. All rights reserved.
        </span>
      </div>
      <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
        {footerLinks.map((l) => (
          <a
            key={l}
            href="#"
            style={{
              fontSize: "0.83rem",
              color: "var(--dim)",
              textDecoration: "none",
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--muted)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--dim)")}
          >
            {l}
          </a>
        ))}
      </div>
    </footer>
  );
}
