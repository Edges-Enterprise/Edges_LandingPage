// src/lib/business-generator/logo/generator.ts

/**
 * Generates a premium PNG app icon.
 * Style: Brand color background with 3D metallic serif letter,
 * glowing metallic border ring, sparkles, floating orb, and light rays.
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

  // =============================
  // Dynamic Color Utilities
  // =============================

  function hexToRgb(hex: string) {
    const clean = hex.replace('#', '');
    const bigint = parseInt(clean, 16);
    return {
      r: (bigint >> 16) & 255,
      g: (bigint >> 8) & 255,
      b: bigint & 255,
    };
  }

  function rgbToHex(r: number, g: number, b: number) {
    return '#' + [r, g, b].map((x) => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  }

  function lighten(hex: string, amount: number = 20) {
    const { r, g, b } = hexToRgb(hex);
    return rgbToHex(
      Math.min(255, r + amount),
      Math.min(255, g + amount),
      Math.min(255, b + amount)
    );
  }

  function darken(hex: string, amount: number = 20) {
    const { r, g, b } = hexToRgb(hex);
    return rgbToHex(
      Math.max(0, r - amount),
      Math.max(0, g - amount),
      Math.max(0, b - amount)
    );
  }

  function rgba(hex: string, alpha: number) {
    const { r, g, b } = hexToRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // Derive a full metallic palette from brandColor
  const lighter  = lighten(brandColor, 80);  // near-white highlight
  const light    = lighten(brandColor, 50);  // bright metallic
  const softer   = lighten(brandColor, 25);  // mid tone
  const darker   = darken(brandColor, 40);   // deep metallic
  const deepest  = darken(brandColor, 80);   // near-black shadow

  const initial = storeName.charAt(0).toUpperCase();
  const cx = size / 2;
  const cy = size / 2;

  // =============================
  // STEP 1 — BRAND COLOR BACKGROUND
  // ✅ Changed from black to brand color
  // =============================

  // Fill with brand color
  ctx.fillStyle = brandColor;
  ctx.fillRect(0, 0, size, size);

  // Add subtle gradient overlay to background
  const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.8);
  bgGrad.addColorStop(0,   rgba(lighter, 0.15));
  bgGrad.addColorStop(0.5, rgba(brandColor, 0.1));
  bgGrad.addColorStop(1,   rgba(deepest, 0.3));

  ctx.save();
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, size, size);
  ctx.restore();

  // Outer ambient glow
  const outerGlow = ctx.createRadialGradient(cx, cy + 60, 180, cx, cy + 60, size * 0.72);
  outerGlow.addColorStop(0,   rgba(lighter, 0.3));
  outerGlow.addColorStop(0.4, rgba(brandColor, 0.1));
  outerGlow.addColorStop(1,   rgba(deepest, 0));

  ctx.save();
  ctx.filter = 'blur(55px)';
  ctx.fillStyle = outerGlow;
  ctx.fillRect(0, 0, size, size);
  ctx.restore();

  // Ground reflection glow beneath card
  const groundGlow = ctx.createRadialGradient(cx, size * 0.89, 20, cx, size * 0.89, 260);
  groundGlow.addColorStop(0,   rgba(lighter, 0.3));
  groundGlow.addColorStop(0.5, rgba(brandColor, 0.1));
  groundGlow.addColorStop(1,   rgba(brandColor, 0));

  ctx.save();
  ctx.filter = 'blur(40px)';
  ctx.fillStyle = groundGlow;
  ctx.fillRect(0, 0, size, size);
  ctx.restore();

  // =============================
  // STEP 2 — CARD SETUP
  // =============================

  const cardSize   = 700;
  const cardX      = cx - cardSize / 2;
  const cardY      = cy - cardSize / 2 - 25;
  const cardRadius = 110;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.transform(1, -0.03, 0.02, 1.0, 0, 0);
  ctx.translate(-cx, -cy);

  // =============================
  // STEP 3 — CARD SHADOW
  // =============================

  ctx.save();
  ctx.shadowColor   = rgba(deepest, 0.9);
  ctx.shadowBlur    = 100;
  ctx.shadowOffsetX = 20;
  ctx.shadowOffsetY = 60;
  drawRoundedSquare(ctx, cardX, cardY, cardSize, cardRadius);
  ctx.fillStyle = darken(brandColor, 60);
  ctx.fill();
  ctx.restore();

  // =============================
  // STEP 4 — METALLIC BORDER RING
  // =============================

  ctx.save();
  ctx.shadowColor = rgba(lighter, 0.6);
  ctx.shadowBlur  = 60;
  drawRoundedSquare(ctx, cardX - 6, cardY - 6, cardSize + 12, cardRadius + 5);
  ctx.strokeStyle = rgba(lighter, 0.5);
  ctx.lineWidth   = 16;
  ctx.stroke();
  ctx.restore();

  const ringGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardSize, cardY + cardSize);
  ringGrad.addColorStop(0,    rgba(lighter,    0.98));
  ringGrad.addColorStop(0.18, rgba(light,      0.92));
  ringGrad.addColorStop(0.42, rgba(brandColor, 0.88));
  ringGrad.addColorStop(0.62, rgba(softer,     0.92));
  ringGrad.addColorStop(0.82, rgba(darker,     0.78));
  ringGrad.addColorStop(1,    rgba(lighter,    0.92));

  ctx.save();
  ctx.shadowColor = rgba(lighter, 0.3);
  ctx.shadowBlur  = 18;
  drawRoundedSquare(ctx, cardX, cardY, cardSize, cardRadius);
  ctx.strokeStyle = ringGrad;
  ctx.lineWidth   = 9;
  ctx.stroke();
  ctx.restore();

  // =============================
  // STEP 5 — FROSTED GLASS CARD FILL
  // =============================

  drawRoundedSquare(ctx, cardX, cardY, cardSize, cardRadius);
  ctx.fillStyle = '#F4F4F6';
  ctx.fill();

  const pearlGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardSize, cardY + cardSize);
  pearlGrad.addColorStop(0,    'rgba(255,255,255,0.94)');
  pearlGrad.addColorStop(0.3,  'rgba(255,255,255,0.78)');
  pearlGrad.addColorStop(0.65, rgba(lighter, 0.16));
  pearlGrad.addColorStop(1,    rgba(softer,  0.20));

  ctx.save();
  drawRoundedSquare(ctx, cardX, cardY, cardSize, cardRadius);
  ctx.clip();
  ctx.fillStyle = pearlGrad;
  ctx.fillRect(cardX, cardY, cardSize, cardSize);
  ctx.restore();

  // =============================
  // STEP 6 — LIGHT RAYS
  // =============================

  ctx.save();
  drawRoundedSquare(ctx, cardX, cardY, cardSize, cardRadius);
  ctx.clip();
  ctx.globalCompositeOperation = 'screen';

  const rayOriginX = cx - 25;
  const rayOriginY = cy + 35;
  const rayAngles  = [-58, -40, -22, -9, 4, 17, 32, 50];

  for (const angle of rayAngles) {
    ctx.save();
    ctx.translate(rayOriginX, rayOriginY);
    ctx.rotate((angle * Math.PI) / 180);

    const rayLength = 720;
    const rayWidth  = 38 + Math.abs(angle) * 0.7;

    const rayGrad = ctx.createLinearGradient(0, 0, 0, -rayLength);
    rayGrad.addColorStop(0,   rgba(lighter, 0.20));
    rayGrad.addColorStop(0.3, rgba(lighter, 0.08));
    rayGrad.addColorStop(1,   'rgba(255,255,255,0)');

    ctx.fillStyle = rayGrad;
    ctx.filter    = 'blur(9px)';
    ctx.beginPath();
    ctx.moveTo(-rayWidth / 2, 0);
    ctx.lineTo(rayWidth / 2, 0);
    ctx.lineTo(rayWidth * 1.6, -rayLength);
    ctx.lineTo(-rayWidth * 1.6, -rayLength);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();

  // =============================
  // STEP 7 — 3D METALLIC SERIF LETTER
  // =============================

  ctx.save();
  drawRoundedSquare(ctx, cardX, cardY, cardSize, cardRadius);
  ctx.clip();

  ctx.font         = `bold 490px "Georgia", "Times New Roman", "Palatino Linotype", serif`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';

  const letterX = cx;
  const letterY = cy + 28;

  // 3D Extrusion layers
  const extrudeSteps = 32;
  for (let d = extrudeSteps; d >= 1; d--) {
    const t    = d / extrudeSteps;
    const offX = d * 0.52;
    const offY = d * 0.72;

    const r1 = hexToRgb(deepest);
    const r2 = hexToRgb(darker);
    const lerp = (a: number, b: number, v: number) => Math.round(a + (b - a) * v);
    const extrudeColor = `rgb(${lerp(r1.r, r2.r, 1 - t)}, ${lerp(r1.g, r2.g, 1 - t)}, ${lerp(r1.b, r2.b, 1 - t)})`;

    ctx.fillStyle = extrudeColor;
    ctx.fillText(initial, letterX + offX, letterY + offY);
  }

  // Ambient glow halo behind letter
  ctx.shadowColor = rgba(lighter, 0.4);
  ctx.shadowBlur  = 65;
  ctx.fillStyle   = rgba(softer, 0.28);
  ctx.fillText(initial, letterX, letterY);
  ctx.shadowColor = 'transparent';

  // Main metallic letter face gradient
  const metalGrad = ctx.createLinearGradient(
    letterX - 240, letterY - 255,
    letterX + 200, letterY + 255
  );
  metalGrad.addColorStop(0,    '#FFFFFF');
  metalGrad.addColorStop(0.08, rgba(lighter,    0.97));
  metalGrad.addColorStop(0.22, rgba(light,      0.95));
  metalGrad.addColorStop(0.38, rgba(brandColor, 1.0));
  metalGrad.addColorStop(0.52, rgba(softer,     0.95));
  metalGrad.addColorStop(0.65, rgba(light,      0.9));
  metalGrad.addColorStop(0.78, rgba(brandColor, 0.85));
  metalGrad.addColorStop(0.9,  rgba(darker,     0.9));
  metalGrad.addColorStop(1,    rgba(deepest,    0.8));

  ctx.shadowColor = rgba(lighter, 0.3);
  ctx.shadowBlur  = 28;
  ctx.fillStyle   = metalGrad;
  ctx.fillText(initial, letterX, letterY);
  ctx.shadowColor = 'transparent';

  // Specular highlight
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.filter    = 'blur(1.2px)';
  ctx.fillStyle = rgba(lighter, 0.52);
  ctx.fillText(initial, letterX - 4, letterY - 5);
  ctx.restore();

  // Glass shine streak
  const shineGrad = ctx.createLinearGradient(letterX - 190, letterY - 210, letterX + 90, letterY - 20);
  shineGrad.addColorStop(0,   'rgba(255,255,255,0.30)');
  shineGrad.addColorStop(0.4, 'rgba(255,255,255,0.10)');
  shineGrad.addColorStop(1,   'rgba(255,255,255,0)');

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  drawRoundedSquare(ctx, cardX, cardY, cardSize, cardRadius);
  ctx.clip();
  ctx.fillStyle = shineGrad;
  ctx.beginPath();
  ctx.ellipse(letterX - 55, letterY - 135, 205, 82, -0.38, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.restore();

  // =============================
  // STEP 8 — FLOATING ORB
  // =============================

  ctx.save();

  const orbX = cardX + cardSize * 0.79;
  const orbY = cardY + cardSize * 0.18;
  const orbR = 50;

  const orbAura = ctx.createRadialGradient(orbX, orbY, orbR * 0.5, orbX, orbY, orbR * 2.2);
  orbAura.addColorStop(0,   rgba(lighter, 0.42));
  orbAura.addColorStop(0.5, rgba(lighter, 0.12));
  orbAura.addColorStop(1,   rgba(lighter, 0));

  ctx.filter = 'blur(18px)';
  ctx.fillStyle = orbAura;
  ctx.beginPath();
  ctx.arc(orbX, orbY, orbR * 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.filter = 'none';

  const orbGrad = ctx.createRadialGradient(
    orbX - orbR * 0.30, orbY - orbR * 0.35, orbR * 0.05,
    orbX,               orbY,               orbR
  );
  orbGrad.addColorStop(0,    rgba(lighter,    1.0));
  orbGrad.addColorStop(0.22, rgba(light,      0.95));
  orbGrad.addColorStop(0.5,  rgba(brandColor, 1.0));
  orbGrad.addColorStop(0.78, rgba(darker,     0.95));
  orbGrad.addColorStop(1,    rgba(deepest,    0.9));

  ctx.shadowColor = rgba(lighter, 0.5);
  ctx.shadowBlur  = 28;
  ctx.beginPath();
  ctx.arc(orbX, orbY, orbR, 0, Math.PI * 2);
  ctx.fillStyle = orbGrad;
  ctx.fill();
  ctx.shadowColor = 'transparent';

  // Orb specular highlight
  ctx.save();
  const specGrad = ctx.createRadialGradient(
    orbX - orbR * 0.28, orbY - orbR * 0.32, 0,
    orbX - orbR * 0.28, orbY - orbR * 0.32, orbR * 0.38
  );
  specGrad.addColorStop(0, 'rgba(255,255,255,0.95)');
  specGrad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.beginPath();
  ctx.arc(orbX, orbY, orbR, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = specGrad;
  ctx.fillRect(orbX - orbR, orbY - orbR, orbR * 2, orbR * 2);
  ctx.restore();

  ctx.restore();

  // =============================
  // STEP 9 — SPARKLE STAR BURSTS
  // =============================

  ctx.save();
  drawRoundedSquare(ctx, cardX, cardY, cardSize, cardRadius);
  ctx.clip();

  const sparklesInside = [
    { x: cardX + cardSize * 0.11, y: cardY + cardSize * 0.21, r: 14 },
    { x: cardX + cardSize * 0.87, y: cardY + cardSize * 0.66, r: 10 },
    { x: cardX + cardSize * 0.74, y: cardY + cardSize * 0.83, r: 8  },
    { x: cardX + cardSize * 0.17, y: cardY + cardSize * 0.79, r: 7  },
    { x: cardX + cardSize * 0.56, y: cardY + cardSize * 0.09, r: 6  },
  ];
  for (const s of sparklesInside) {
    drawSparkle(ctx, s.x, s.y, s.r, rgba(lighter, 0.88));
  }
  ctx.restore();

  // Outer sparkles
  ctx.save();
  const sparklesOutside = [
    { x: cardX - 38,              y: cardY + cardSize * 0.44, r: 11 },
    { x: cardX + cardSize + 32,   y: cardY + cardSize * 0.28, r: 9  },
    { x: cardX + cardSize * 0.28, y: cardY + cardSize + 28,   r: 7  },
    { x: cardX + cardSize * 0.72, y: cardY + cardSize + 20,   r: 6  },
  ];
  for (const s of sparklesOutside) {
    drawSparkle(ctx, s.x, s.y, s.r, rgba(lighter, 0.8));
  }
  ctx.restore();

  // =============================
  // STEP 10 — CARD INNER VIGNETTE
  // =============================

  ctx.save();
  drawRoundedSquare(ctx, cardX, cardY, cardSize, cardRadius);
  ctx.clip();
  const innerVig = ctx.createRadialGradient(cx, cy, cardSize * 0.22, cx, cy, cardSize * 0.62);
  innerVig.addColorStop(0, 'rgba(0,0,0,0)');
  innerVig.addColorStop(1, 'rgba(0,0,0,0.16)');
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = innerVig;
  ctx.fillRect(cardX, cardY, cardSize, cardSize);
  ctx.restore();

  ctx.restore();

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

// =============================
// HELPER: Draw a 4-point star sparkle
// =============================
function drawSparkle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
) {
  ctx.save();
  ctx.translate(x, y);

  const spGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 2.5);
  spGrad.addColorStop(0, color);
  spGrad.addColorStop(1, 'rgba(255,255,255,0)');

  ctx.shadowColor = color;
  ctx.shadowBlur  = r * 2.5;

  for (let rot = 0; rot < 2; rot++) {
    ctx.save();
    ctx.rotate((rot * Math.PI) / 4);
    ctx.fillStyle = spGrad;
    ctx.beginPath();
    ctx.moveTo(0, -r * 2.5);
    ctx.quadraticCurveTo(r * 0.18, -r * 0.18, r * 2.5, 0);
    ctx.quadraticCurveTo(r * 0.18, r * 0.18, 0, r * 2.5);
    ctx.quadraticCurveTo(-r * 0.18, r * 0.18, -r * 2.5, 0);
    ctx.quadraticCurveTo(-r * 0.18, -r * 0.18, 0, -r * 2.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
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

/**
 * Generates a notification icon (96x96, white silhouette on transparent).
 */
export async function generateNotificationIcon(
  storeName: string,
): Promise<Blob> {
  const size = 96;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  ctx.clearRect(0, 0, size, size);

  const initial = storeName.charAt(0).toUpperCase();
  const cx = size / 2;
  const cy = size / 2;

  ctx.font = `bold ${size * 0.6}px "Georgia", "Playfair Display", "Times New Roman", serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.fillStyle = "#FFFFFF";
  ctx.fillText(initial, cx, cy);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to generate notification icon"));
      },
      "image/png",
      1.0,
    );
  });
}