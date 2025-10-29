import SignUpForm from '@/components/sign-up-form';

export default function SignUpPage() {
  return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center px-4 sm:px-6 lg:px-20 py-8">
      <div className="w-full max-w-md">
        <SignUpForm />
      </div>
    </main>
  );
}