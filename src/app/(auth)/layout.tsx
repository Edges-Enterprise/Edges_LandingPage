// app/sign-in/layout.tsx (or app/(auth)/layout.tsx)
import type { Metadata } from "next";
import { Inter } from "next/font/google"; // Or your preferred font

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Sign In - Edges Network",
  description: "Sign in to your account",
};

export default function SignInLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className={inter.className}>
      {children}
    </main>
  );
}
