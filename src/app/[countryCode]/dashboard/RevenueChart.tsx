// src/app/[countryCode]/dashboard/RevenueChart.tsx
"use client";

import { useEffect, useRef } from "react";

interface RevenueChartProps {
  revenue: any[];
  currencySymbol: string;
  translations: any;
}

export default function RevenueChart({
  revenue,
  currencySymbol,
  translations,
}: RevenueChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !revenue || revenue.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.parentElement?.getBoundingClientRect();
    canvas.width = (rect?.width || 400) * 2;
    canvas.height = 300 * 2;
    canvas.style.width = (rect?.width || 400) + "px";
    canvas.style.height = "300px";
    ctx.scale(2, 2);

    const width = rect?.width || 400;
    const height = 300;

    const maxRevenue = Math.max(...revenue.map((r) => r.revenue || 0), 1);
    const padding = { top: 20, bottom: 30, left: 40, right: 20 };
    const chartHeight = height - padding.top - padding.bottom;
    const chartWidth = width - padding.left - padding.right;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Draw grid lines
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
      const y = padding.top + (chartHeight / gridLines) * i;
      const value = maxRevenue - (maxRevenue / gridLines) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.strokeStyle = "rgba(201,138,84,0.08)";
      ctx.stroke();

      // Labels
      ctx.fillStyle = "#6B7280";
      ctx.font = "10px sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(
        `${currencySymbol} ${Math.round(value).toLocaleString()}`,
        padding.left - 5,
        y + 3,
      );
    }

    if (revenue.length === 0) {
      ctx.fillStyle = "#6B7280";
      ctx.font = "14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(
        translations?.noData || "No revenue data yet",
        width / 2,
        height / 2,
      );
      return;
    }

    // Draw bars
    const barWidth = Math.min((chartWidth / revenue.length) * 0.6, 40);
    const gap = chartWidth / revenue.length;

    revenue.forEach((item, index) => {
      const x = padding.left + index * gap + (gap - barWidth) / 2;
      const value = item.revenue || 0;
      const barHeight = (value / maxRevenue) * chartHeight;
      const y = padding.top + chartHeight - barHeight;

      // Bar
      const gradient = ctx.createLinearGradient(
        x,
        y,
        x,
        padding.top + chartHeight,
      );
      gradient.addColorStop(0, "rgba(201,138,84,0.8)");
      gradient.addColorStop(1, "rgba(201,138,84,0.2)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, 4);
      ctx.fill();

      // Bar border
      ctx.strokeStyle = "rgba(201,138,84,0.3)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, 4);
      ctx.stroke();

      // X-axis labels
      const label = new Date(item.period).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      ctx.fillStyle = "#6B7280";
      ctx.font = "10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(label, x + barWidth / 2, padding.top + chartHeight + 15);
    });

    // Draw bottom border
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top + chartHeight);
    ctx.lineTo(width - padding.right, padding.top + chartHeight);
    ctx.strokeStyle = "var(--border)";
    ctx.stroke();
  }, [revenue, currencySymbol, translations]);

  if (!revenue || revenue.length === 0) {
    return (
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: "1.5rem",
          minHeight: 300,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <p style={{ color: "var(--dim)" }}>
          {translations?.noRevenueData || "No revenue data available"}
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "1.5rem",
      }}
    >
      <h3
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "1rem",
          fontWeight: 700,
          marginBottom: "0.5rem",
        }}
      >
        {translations?.revenueChart || "Revenue Overview"}
      </h3>
      <div style={{ position: "relative" }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}

// RoundRect polyfill for canvas
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (
    x: number,
    y: number,
    w: number,
    h: number,
    radii: number,
  ) {
    const r = Math.min(radii, Math.min(w, h) / 2);
    this.moveTo(x + r, y);
    this.lineTo(x + w - r, y);
    this.quadraticCurveTo(x + w, y, x + w, y + r);
    this.lineTo(x + w, y + h - r);
    this.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.lineTo(x + r, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - r);
    this.lineTo(x, y + r);
    this.quadraticCurveTo(x, y, x + r, y);
  };
}
