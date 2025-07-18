// // // // 'use client';

// // // // import { useEffect } from 'react';
// // // // import { useSearchParams } from 'next/navigation';

// // // // export default function RedirectResetPassword() {
// // // //   const searchParams = useSearchParams();

// // // //   useEffect(() => {
// // // //     const token = searchParams.get('token');
// // // //     const type = searchParams.get('type');

// // // //     if (token && type === 'recovery') {
// // // //       // Safely redirect to your deep link
// // // //       const encodedToken = encodeURIComponent(token);
// // // //       const link = `edges-network://reset-password?token=${encodedToken}&type=recovery`;
// // // //       window.location.href = link;
// // // //     }
// // // //   }, [searchParams]);

// // // //   return (
// // // //     <div style={{ textAlign: 'center', marginTop: '100px' }}>
// // // //       <p>Redirecting...please wait</p>
// // // //     </div>
// // // //   );
// // // // }


// // // "use client";

// // // import { useEffect } from "react";
// // // import { useSearchParams } from "next/navigation";

// // // export default function RedirectResetPassword() {
// // //   const searchParams = useSearchParams();

// // //   useEffect(() => {
// // //     const token = searchParams.get("token");
// // //     const type = searchParams.get("type");

// // //     if (token && type === "recovery") {
// // //       const encodedToken = encodeURIComponent(token);
// // //       const deepLink = `edges-network://reset-password?token=${encodedToken}&type=recovery`;
// // //       window.location.href = deepLink;
// // //     }
// // //   }, [searchParams]);

// // //   return (
// // //     <div style={styles.wrapper}>
// // //       <div style={styles.container}>
// // //         <Image src="/edgesnetworkicon.png" alt="Logo" style={styles.logo} />
// // //         <p style={styles.title}>Redirecting... please wait.</p>
// // //       </div>
// // //     </div>
// // //   );
// // // }

// // // const styles = {
// // //   wrapper: {
// // //     backgroundColor: "black",
// // //     color: "#aaa",
// // //     minHeight: "100vh",
// // //     display: "flex",
// // //     justifyContent: "center",
// // //     alignItems: "center",
// // //     padding: "0 20px",
// // //   },

// // //   container: {
// // //     textAlign: "center" as const,
// // //     maxWidth: 400,
// // //   },

// // //   logo: {
// // //     width: 150,
// // //     height: 150,
// // //     borderRadius: 70,
// // //     marginBottom: 20,
// // //     objectFit: "cover" as const,
// // //   },

// // //   title: {
// // //     fontSize: 20,
// // //     color: "#fff",
// // //     marginBottom: 10,
// // //     fontWeight: "bold" as const,
// // //   },

// // //   text: {
// // //     fontSize: 14,
// // //     lineHeight: 1.6,
// // //     color: "#aaa",
// // //   },
// // // };


// // "use client";

// // import { useEffect } from "react";
// // import { useSearchParams } from "next/navigation";

// // export default function RedirectResetPassword() {
// //   const searchParams = useSearchParams();

// //   useEffect(() => {
// //     const token = searchParams.get("token");
// //     const type = searchParams.get("type");

// //     if (token && type === "recovery") {
// //       const encodedToken = encodeURIComponent(token);
// //       window.location.href = `edges-network://reset-password?token=${encodedToken}&type=recovery`;
// //     }
// //   }, [searchParams]);

// //   return (
// //     <div style={styles.wrapper}>
// //       <div style={styles.container}>
// //         <img src="edgesnetworkicon.png" alt="Logo" style={styles.logo} />
// //         <p style={styles.title}>Redirecting to App...</p>
// //         <p style={styles.text}>
// //           If you are not redirected, open your app manually or retry from your
// //           mobile.
// //         </p>
// //       </div>
// //     </div>
// //   );
// // }

// // const styles = {
// //   wrapper: {
// //     backgroundColor: "black",
// //     color: "#aaa",
// //     minHeight: "100vh",
// //     display: "flex",
// //     justifyContent: "center",
// //     alignItems: "center",
// //     padding: "0 20px",
// //   },

// //   container: {
// //     textAlign: "center" as const,
// //     maxWidth: 400,
// //   },

// //   logo: {
// //     width: 150,
// //     height: 150,
// //     borderRadius: 70,
// //     marginBottom: 20,
// //     objectFit: "cover" as const,
// //   },

// //   title: {
// //     fontSize: 20,
// //     color: "#fff",
// //     marginBottom: 10,
// //     fontWeight: "bold" as const,
// //   },

// //   text: {
// //     fontSize: 14,
// //     lineHeight: 1.6,
// //     color: "#aaa",
// //   },
// // };


// "use client";

// import { useEffect, Suspense } from "react";
// import { useSearchParams } from "next/navigation";
// import Image from "next/image";

// function RedirectResetPasswordContent() {
//   const searchParams = useSearchParams();

//   useEffect(() => {
//     const token = searchParams.get("token");
//     const type = searchParams.get("type");

//     if (token && type === "recovery") {
//       const encodedToken = encodeURIComponent(token);
//       window.location.href = `edges-network://reset-password?token=${encodedToken}&type=recovery`;
//     }
//   }, [searchParams]);

//   return (
//     <div style={styles.wrapper}>
//       <div style={styles.container}>
//         <Image
//           src="/edgesnetworkicon.png"
//           alt="Edges Network Logo"
//           width={150}
//           height={150}
//           style={styles.logo}
//         />
//         <p style={styles.title}>Redirecting...</p>
//         <p style={styles.text}>please wait.</p>
//       </div>
//     </div>
//   );
// }

// export default function RedirectResetPassword() {
//   return (
//     <Suspense fallback={<LoadingFallback />}>
//       <RedirectResetPasswordContent />
//     </Suspense>
//   );
// }

// function LoadingFallback() {
//   return (
//     <div style={styles.wrapper}>
//       <div style={styles.container}>
//         <Image
//           src="/edgesnetworkicon.png"
//           alt="Edges Network Logo"
//           width={150}
//           height={150}
//           style={styles.logo}
//         />
//         <p style={styles.title}>Loading...</p>
//       </div>
//     </div>
//   );
// }

// const styles = {
//   wrapper: {
//     backgroundColor: "black",
//     color: "#aaa",
//     minHeight: "100vh",
//     display: "flex",
//     justifyContent: "center",
//     alignItems: "center",
//     padding: "0 20px",
//   },

//   container: {
//     textAlign: "center" as const,
//     maxWidth: 400,
//   },

//   logo: {
//     width: 150,
//     height: 150,
//     borderRadius: 70,
//     marginBottom: 20,
//     objectFit: "cover" as const,
//   },

//   title: {
//     fontSize: 20,
//     color: "#fff",
//     marginBottom: 10,
//     fontWeight: "bold" as const,
//   },

//   text: {
//     fontSize: 14,
//     lineHeight: 1.6,
//     color: "#aaa",
//   },
// };

"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";

function RedirectResetPasswordContent() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token");
    const type = searchParams.get("type");

    // Validate that we have the required parameters
    if (!token || type !== "recovery") {
      console.error("Missing or invalid parameters for password reset");
      return;
    }

    const encodedToken = encodeURIComponent(token);
    const deepLink = `edges-network://reset-password?token=${encodedToken}&type=recovery`;

    // Log the deep link for debugging
    console.log("Attempting to open deep link:", deepLink);

    // Detect if user is on mobile
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (isMobile) {
      // Mobile deep link handling
      try {
        window.location.href = deepLink;
      } catch (error) {
        console.log("Mobile deep link failed:", error);
      }

      // Fallback: Try creating a temporary link
      setTimeout(() => {
        const link = document.createElement("a");
        link.href = deepLink;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, 500);
    } else {
      // Desktop: might need different handling or show instructions
      console.log("Desktop detected - deep link might not work");
      // You could show different UI for desktop users
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
        <p style={styles.title}>Redirecting to App...</p>
        <p style={styles.text}>
          If you are not redirected, open your app manually or retry from your
          mobile.
        </p>
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