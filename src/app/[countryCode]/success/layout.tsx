// src/app/[countryCode]/success/layout.tsx
export default function SuccessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div style={{ paddingTop: "80px" }}>{children}</div>;
}
