// app/reseller/generateIcon.ts

/**
 * Generates a premium, wow-factor PNG app icon.
 * White rounded square with brand-colored letter on transparent background.
 * Size: 1024×1024px
 */
export async function generateIconPng(
  storeName: string,
  brandColor: string,
): Promise<Blob> {
  const size = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  // ─── Transparent background ───
  ctx.clearRect(0, 0, size, size);

  const initial = storeName.charAt(0).toUpperCase();
  const cx = size / 2;
  const cy = size / 2;

  // ─── Outer glow ring ───
  const outerRadius = 440;
  const glowGradient = ctx.createRadialGradient(
    cx,
    cy,
    outerRadius - 40,
    cx,
    cy,
    outerRadius + 20,
  );
  glowGradient.addColorStop(0, "rgba(255, 255, 255, 0)");
  glowGradient.addColorStop(0.7, "rgba(255, 255, 255, 0.05)");
  glowGradient.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.beginPath();
  ctx.arc(cx, cy, outerRadius + 20, 0, Math.PI * 2);
  ctx.fillStyle = glowGradient;
  ctx.fill();

  // ─── Main rounded square with shadow ───
  const squareSize = 600;
  const squareX = cx - squareSize / 2;
  const squareY = cy - squareSize / 2;
  const squareRadius = 120;

  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.08)";
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 8;
  drawRoundedSquare(ctx, squareX, squareY, squareSize, squareRadius);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();
  ctx.restore();

  // ─── Inner subtle gradient overlay ───
  const overlayGradient = ctx.createLinearGradient(
    cx,
    squareY,
    cx,
    squareY + squareSize,
  );
  overlayGradient.addColorStop(0, "rgba(255, 255, 255, 0.3)");
  overlayGradient.addColorStop(0.5, "rgba(255, 255, 255, 0)");
  overlayGradient.addColorStop(1, "rgba(0, 0, 0, 0.03)");
  drawRoundedSquare(ctx, squareX, squareY, squareSize, squareRadius);
  ctx.fillStyle = overlayGradient;
  ctx.fill();

  // ─── Brand-colored accent dot ───
  const dotRadius = 28;
  const dotX = cx + squareSize * 0.28;
  const dotY = cy - squareSize * 0.28;
  ctx.beginPath();
  ctx.arc(dotX, dotY, dotRadius, 0, Math.PI * 2);
  ctx.fillStyle = brandColor;
  ctx.fill();

  // ─── Brand-colored letter (elegant serif) ───
  ctx.fillStyle = brandColor;
  ctx.font = `bold 380px "Georgia", "Playfair Display", "Times New Roman", serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(initial, cx, cy + 8);

  // ─── Brand-colored line accent ───
  const lineWidth = 80;
  const lineHeight = 6;
  const lineY = cy + squareSize * 0.32;
  ctx.beginPath();
  ctx.roundRect(cx - lineWidth / 2, lineY, lineWidth, lineHeight, 3);
  ctx.fillStyle = brandColor;
  ctx.fill();

  // ─── Tiny decorative dots ───
  const tinyDots = [
    { x: cx - squareSize * 0.35, y: cy + squareSize * 0.1 },
    { x: cx + squareSize * 0.38, y: cy - squareSize * 0.15 },
    { x: cx - squareSize * 0.1, y: cy - squareSize * 0.35 },
  ];
  tinyDots.forEach(({ x, y }) => {
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fillStyle = brandColor + "50";
    ctx.fill();
  });

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to generate icon"));
      },
      "image/png",
      1.0,
    );
  });
}

/**
 * Helper: Draws a rounded square path on the canvas.
 */
function drawRoundedSquare(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  radius: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + size - radius, y);
  ctx.quadraticCurveTo(x + size, y, x + size, y + radius);
  ctx.lineTo(x + size, y + size - radius);
  ctx.quadraticCurveTo(x + size, y + size, x + size - radius, y + size);
  ctx.lineTo(x + radius, y + size);
  ctx.quadraticCurveTo(x, y + size, x, y + size - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}
