// src/app/page.tsx
import { redirect } from "next/navigation";

// The Edges Network site lives at /edges on this branch; there is no
// country/reseller marketing page here.
export default function Home() {
  redirect("/edges");
}
