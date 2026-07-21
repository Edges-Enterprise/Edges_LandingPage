// src/app/[countryCode]/dashboard/app/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getBuildStatus } from "@/actions/reseller/build/getBuildStatus";
import { getBuildHistory } from "@/actions/reseller/build/getBuildHistory";

export default function AppBuildPage() {
  const params = useParams();
  const countryCode = params.countryCode as string;

  const [buildStatus, setBuildStatus] = useState<any>(null);
  const [buildHistory, setBuildHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [status, history] = await Promise.all([
          getBuildStatus(),
          getBuildHistory(),
        ]);
        setBuildStatus(status);
        setBuildHistory(history);
      } catch (error) {
        console.error("Failed to fetch build data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>App Build Status</h1>

      {/* Current Build Status */}
      {buildStatus && (
        <div>
          <h2>Current Build</h2>
          <p>Status: {buildStatus.build_status}</p>
          {buildStatus.apk_url && (
            <a href={buildStatus.apk_url} download>
              Download APK
            </a>
          )}
          {buildStatus.error_message && (
            <p>Error: {buildStatus.error_message}</p>
          )}
        </div>
      )}

      {/* Build History */}
      <h2>Build History</h2>
      {buildHistory.map((build) => (
        <div key={build.id}>
          <p>Status: {build.build_status}</p>
          <p>Queued: {new Date(build.queued_at).toLocaleString()}</p>
          {build.apk_url && (
            <a href={build.apk_url} download>
              Download APK
            </a>
          )}
        </div>
      ))}
    </div>
  );
}
