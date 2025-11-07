// app/(protected)/data/[id]/page.tsx

export default async function DataProviderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        serviceprovider: {id}
      </div>
    </div>
  );
}
