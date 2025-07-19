
"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";

function RedirectResetPasswordContent() {
  // const searchParams = useSearchParams();

  // useEffect(() => {
  //   const token = searchParams.get("token");
  //   const type = searchParams.get("type");

  //   if (token && type === "recovery") {
  //     const encodedToken = encodeURIComponent(token);
  //     window.location.href = `edges-network://reset-password?token=${encodedToken}&type=recovery`;
  //   }
  // }, [searchParams]);

  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token");
    const type = searchParams.get("type");
    const email = searchParams.get("email");
    if (token && type === "recovery" && email) {
      const encodedToken = encodeURIComponent(token);
      const encodedEmail = encodeURIComponent(email);
      // const deepLink = `edges-network://reset-password?token=${encodedToken}&type=recovery`;
      const deepLink = `edges-network://reset-password?token=${encodedToken}&type=recovery&email=${encodedEmail}`;

      // Try to open the app
      window.location.href = deepLink;

      // Fallback: If the app isn't installed, redirect to app store or show instructions
      setTimeout(() => {
        if (!document.hidden) {
          // App wasn't opened, show fallback UI
          // const fallbackElement = document.getElementById(
          //   "fallback-instructions"
          // );
          // if (fallbackElement) {
          //   fallbackElement.style.display = "block";
          // }

          // Optionally redirect to app store
          // window.location.href = "https://apps.apple.com/app/id..."; // iOS
          window.location.href = "https://edges-landing-page.vercel.app/"; // Android
        }
      }, 3000);
    }
  }, [searchParams]);


  return (
    <div style={styles.wrapper}>
      <div style={styles.container}>
        <Image
          src="/edgesnetworkicon.png"
          alt="Edges Network Logo"
          width={150}
          height={150}
          style={styles.logo}
        />
        <p style={styles.title}>Redirecting...</p>
        <p style={styles.text}>please wait.</p>
      </div>
    </div>
  );
}

export default function RedirectResetPassword() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <RedirectResetPasswordContent />
    </Suspense>
  );
}

function LoadingFallback() {
  return (
    <div style={styles.wrapper}>
      <div style={styles.container}>
        <Image
          src="/edgesnetworkicon.png"
          alt="Edges Network Logo"
          width={150}
          height={150}
          style={styles.logo}
        />
        <p style={styles.title}>Loading...</p>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    backgroundColor: "black",
    color: "#aaa",
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "0 20px",
  },

  container: {
    textAlign: "center" as const,
    maxWidth: 400,
  },

  logo: {
    width: 150,
    height: 150,
    borderRadius: 70,
    marginBottom: 20,
    objectFit: "cover" as const,
  },

  title: {
    fontSize: 20,
    color: "#fff",
    marginBottom: 10,
    fontWeight: "bold" as const,
  },

  text: {
    fontSize: 14,
    lineHeight: 1.6,
    color: "#aaa",
  },
};
