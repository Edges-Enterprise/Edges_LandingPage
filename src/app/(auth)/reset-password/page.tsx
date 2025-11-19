import { Suspense } from "react";
import { ResetPasswordClient } from "@/components/reset-password";

const ResetPassword = () => {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="text-white">Loading...</div>
        </div>
      }
    >
      <ResetPasswordClient />
    </Suspense>
  );
};
export default ResetPassword;

// import React from 'react'
// import { ResetPasswordClient } from '@/components/reset-password'

// const ResetPassword = () => {
//   return <ResetPasswordClient/>

// }

// export default ResetPassword
