// app/(reseller-dashboard)/r-dashboard/Badge.tsx

interface BadgeProps {
  children: React.ReactNode;
  variant: "success" | "warning" | "error" | "info";
}

export function Badge({ children, variant }: BadgeProps) {
  const variants: Record<string, React.CSSProperties> = {
    success: {
      background: "rgba(110,189,138,0.12)",
      border: "1px solid rgba(110,189,138,0.25)",
      color: "#6EBD8A",
    },
    warning: {
      background: "rgba(251,191,36,0.12)",
      border: "1px solid rgba(251,191,36,0.25)",
      color: "#FBBF24",
    },
    error: {
      background: "rgba(239,68,68,0.12)",
      border: "1px solid rgba(239,68,68,0.25)",
      color: "#F87171",
    },
    info: {
      background: "rgba(201,138,84,0.12)",
      border: "1px solid rgba(201,138,84,0.25)",
      color: "var(--accent-lt)",
    },
  };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "0.2rem 0.6rem",
        borderRadius: 100,
        fontSize: "0.72rem",
        fontWeight: 600,
        textTransform: "capitalize",
        letterSpacing: "0.02em",
        ...variants[variant],
      }}
    >
      {children}
    </span>
  );
}
