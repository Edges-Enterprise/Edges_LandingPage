'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export default function RedirectResetPassword() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    const type = searchParams.get('type');

    if (token && type === 'recovery') {
      // Safely redirect to your deep link
      const encodedToken = encodeURIComponent(token);
      const link = `edges-network://reset-password?token=${encodedToken}&type=recovery`;
      window.location.href = link;
    }
  }, [searchParams]);

  return (
    <div style={{ textAlign: 'center', marginTop: '100px' }}>
      <p>Redirecting...please wait</p>
    </div>
  );
}
