import { Suspense } from "react";
import { ResetPasswordClient } from "@/components/reset-password";
import StoreLoader, { PLATFORM_LABEL } from "@/components/common/StoreLoader";

const ResetPassword = () => {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black">
          <StoreLoader label={PLATFORM_LABEL} fullScreen dark />
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
