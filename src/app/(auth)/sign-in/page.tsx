// app/(auth)/sign-in/page.tsx
import SignInForm from '@/components/sign-in-form'; // Client Component below

export default function SignInPage() {
  return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center px-4 sm:px-6 lg:px-20 py-8">
      <div className="w-full max-w-md flex flex-col items-center">
        <SignInForm />
      </div>
    </main>
  );
}