// src/app/[countryCode]/apply/layout.tsx
export default function ApplyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div style={{ paddingTop: "80px" }}>{children}</div>;
}
