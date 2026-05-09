// app/reseller/generateIcon.ts

/**
 * Generates a cinematic, AAA-quality PNG app icon.
 * Full-canvas energy burst composition with metallic 3D letter.
 * Works with ANY letter and ANY brand color combination.
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

  const lighter  = lighten(brandColor, 70);
  const softer   = lighten(brandColor, 35);
  const darker   = darken(brandColor, 50);
  const deepest  = darken(brandColor, 90);

  const initial = storeName.charAt(0).toUpperCase();
  const cx = size / 2;
  const cy = size / 2;

  // ─── Clear canvas ───
  ctx.clearRect(0, 0, size, size);

  // =============================
  // STEP 1 — CINEMATIC BACKGROUND
  // Full-canvas deep radial gradient, no white square
  // =============================

  const bgGradient = ctx.createRadialGradient(cx, cy, 60, cx, cy, size * 0.85);
  bgGradient.addColorStop(0,   rgba(softer,   1.0));
  bgGradient.addColorStop(0.2, rgba(brandColor, 1.0));
  bgGradient.addColorStop(0.6, rgba(darker,   1.0));
  bgGradient.addColorStop(1,   rgba(deepest,  1.0));

  ctx.save();
  // Rounded square clip so the icon stays app-icon shaped
  drawRoundedSquare(ctx, 0, 0, size, 180);
  ctx.clip();
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, size, size);
  ctx.restore();

  // =============================
  // STEP 2 — ENERGY BURST RAYS
  // Cinematic starburst from center
  // =============================

  ctx.save();
  drawRoundedSquare(ctx, 0, 0, size, 180);
  ctx.clip();
  ctx.translate(cx, cy);
  ctx.globalCompositeOperation = 'screen';

  const rayCount = 160;
  for (let i = 0; i < rayCount; i++) {
    ctx.save();
    ctx.rotate((Math.PI * 2 * i) / rayCount);

    const length = size * 0.55 + Math.random() * size * 0.2;
    const width  = 1.5 + Math.random() * 6;

    const rayGrad = ctx.createLinearGradient(0, 0, 0, -length);
    rayGrad.addColorStop(0,   rgba(lighter, 0.55));
    rayGrad.addColorStop(0.3, rgba(softer,  0.18));
    rayGrad.addColorStop(1,   rgba(brandColor, 0));

    ctx.fillStyle = rayGrad;
    ctx.filter = 'blur(1.5px)';
    ctx.fillRect(-width / 2, -length, width, length);
    ctx.restore();
  }

  ctx.restore();

  // =============================
  // STEP 3 — CORE BLOOM GLOW
  // Intense center light bloom
  // =============================

  ctx.save();
  drawRoundedSquare(ctx, 0, 0, size, 180);
  ctx.clip();

  const bloomGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.55);
  bloomGrad.addColorStop(0,   rgba(lighter, 0.55));
  bloomGrad.addColorStop(0.2, rgba(softer,  0.3));
  bloomGrad.addColorStop(0.5, rgba(brandColor, 0.1));
  bloomGrad.addColorStop(1,   rgba(deepest, 0));

  ctx.globalCompositeOperation = 'screen';
  ctx.filter = 'blur(60px)';
  ctx.fillStyle = bloomGrad;
  ctx.fillRect(0, 0, size, size);
  ctx.restore();

  // =============================
  // STEP 4 — 3D EXTRUDED LETTER
  // Deep extrusion + metallic gradient + neon glow
  // =============================

  ctx.save();
  drawRoundedSquare(ctx, 0, 0, size, 180);
  ctx.clip();

  ctx.font = `900 520px "Arial Black", "Impact", "Haettenschweiler", sans-serif`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';

  // --- Extrusion layers (3D depth shadow) ---
  const extrudeDepth = 22;
  for (let d = extrudeDepth; d >= 1; d--) {
    const fade = 1 - d / (extrudeDepth + 1);
    ctx.fillStyle = rgba(deepest, 0.55 * fade);
    ctx.fillText(initial, cx + d * 0.9, cy + d * 1.1);
  }

  // --- Ambient depth shadow ---
  ctx.shadowColor   = rgba(deepest, 0.7);
  ctx.shadowBlur    = 80;
  ctx.shadowOffsetX = 12;
  ctx.shadowOffsetY = 18;
  ctx.fillStyle = rgba(deepest, 0.4);
  ctx.fillText(initial, cx, cy);
  ctx.shadowColor = 'transparent';

  // --- Neon halo glow behind letter ---
  ctx.shadowColor = rgba(lighter, 0.9);
  ctx.shadowBlur  = 90;
  ctx.fillStyle   = rgba(lighter, 0.12);
  ctx.fillText(initial, cx, cy);
  ctx.shadowColor = 'transparent';

  // --- Main metallic gradient body ---
  const metalGrad = ctx.createLinearGradient(cx - 260, cy - 260, cx + 260, cy + 260);
  metalGrad.addColorStop(0,    '#FFFFFF');
  metalGrad.addColorStop(0.15, lighter);
  metalGrad.addColorStop(0.35, softer);
  metalGrad.addColorStop(0.5,  '#FFFFFF');
  metalGrad.addColorStop(0.65, brandColor);
  metalGrad.addColorStop(0.82, softer);
  metalGrad.addColorStop(1,    darker);

  ctx.shadowColor = rgba(lighter, 0.6);
  ctx.shadowBlur  = 45;
  ctx.fillStyle   = metalGrad;
  ctx.fillText(initial, cx, cy);
  ctx.shadowColor = 'transparent';

  // --- Top-left specular highlight (bevel illusion) ---
  ctx.globalCompositeOperation = 'screen';
  ctx.filter    = 'blur(2px)';
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillText(initial, cx - 5, cy - 6);

  // --- Glass shine streak across letter ---
  const shineGrad = ctx.createLinearGradient(cx - 200, cy - 200, cx + 100, cy + 50);
  shineGrad.addColorStop(0, 'rgba(255,255,255,0.28)');
  shineGrad.addColorStop(0.5, 'rgba(255,255,255,0.08)');
  shineGrad.addColorStop(1, 'rgba(255,255,255,0)');

  ctx.filter    = 'none';
  ctx.fillStyle = shineGrad;
  ctx.beginPath();
  ctx.ellipse(cx - 60, cy - 110, 180, 70, -0.35, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // =============================
  // STEP 5 — EDGE RING ACCENT
  // Neon rim light ring around composition
  // =============================

  ctx.save();
  drawRoundedSquare(ctx, 0, 0, size, 180);
  ctx.clip();

  const ringGrad = ctx.createLinearGradient(0, 0, size, size);
  ringGrad.addColorStop(0,   rgba(lighter,    0.7));
  ringGrad.addColorStop(0.4, rgba(brandColor, 0.35));
  ringGrad.addColorStop(1,   rgba(darker,     0.15));

  ctx.globalCompositeOperation = 'screen';
  ctx.strokeStyle = ringGrad;
  ctx.lineWidth   = 3;
  drawRoundedSquare(ctx, 4, 4, size - 8, 178);
  ctx.stroke();
  ctx.restore();

  // =============================
  // STEP 6 — ACCENT ORB
  // Small neon orb top-right corner
  // =============================

  ctx.save();
  drawRoundedSquare(ctx, 0, 0, size, 180);
  ctx.clip();

  const dotX = cx + 215;
  const dotY = cy - 210;

  const orbGrad = ctx.createRadialGradient(dotX, dotY, 0, dotX, dotY, 65);
  orbGrad.addColorStop(0,   rgba(lighter,    1.0));
  orbGrad.addColorStop(0.4, rgba(brandColor, 0.9));
  orbGrad.addColorStop(1,   rgba(brandColor, 0));

  ctx.shadowColor = rgba(lighter, 0.9);
  ctx.shadowBlur  = 35;
  ctx.fillStyle   = orbGrad;
  ctx.beginPath();
  ctx.arc(dotX, dotY, 28, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // =============================
  // STEP 7 — BOTTOM ACCENT LINE
  // Glowing brand-color bar below letter
  // =============================

  ctx.save();
  drawRoundedSquare(ctx, 0, 0, size, 180);
  ctx.clip();

  const lineY  = cy + 295;
  const lineGrad = ctx.createLinearGradient(cx - 60, lineY, cx + 60, lineY);
  lineGrad.addColorStop(0,   rgba(lighter,    0.0));
  lineGrad.addColorStop(0.3, rgba(brandColor, 0.9));
  lineGrad.addColorStop(0.5, rgba(lighter,    1.0));
  lineGrad.addColorStop(0.7, rgba(brandColor, 0.9));
  lineGrad.addColorStop(1,   rgba(lighter,    0.0));

  ctx.shadowColor = rgba(lighter, 0.8);
  ctx.shadowBlur  = 22;
  ctx.fillStyle   = lineGrad;
  ctx.beginPath();
  ctx.roundRect(cx - 80, lineY, 160, 7, 4);
  ctx.fill();
  ctx.restore();

  // =============================
  // STEP 8 — VIGNETTE
  // Edge darkening for cinematic depth
  // =============================

  ctx.save();
  drawRoundedSquare(ctx, 0, 0, size, 180);
  ctx.clip();

  const vignette = ctx.createRadialGradient(cx, cy, size * 0.28, cx, cy, size * 0.78);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.55)');

  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, size, size);
  ctx.restore();

  // ─── Return PNG blob ───
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

// // app/reseller/generateIcon.ts

// /**
//  * Generates a premium, wow-factor PNG app icon.
//  * White rounded square with brand-colored letter on transparent background.
//  * Size: 1024×1024px
//  */
// export async function generateIconPng(
//   storeName: string,
//   brandColor: string,
// ): Promise<Blob> {
//   const size = 1024;
//   const canvas = document.createElement("canvas");
//   canvas.width = size;
//   canvas.height = size;
//   const ctx = canvas.getContext("2d")!;

//   // =============================
//   // Dynamic Color Utilities
//   // =============================

//   function hexToRgb(hex: string) {
//     const clean = hex.replace('#', '');
//     const bigint = parseInt(clean, 16);
//     return {
//       r: (bigint >> 16) & 255,
//       g: (bigint >> 8) & 255,
//       b: bigint & 255,
//     };
//   }

//   function rgbToHex(r: number, g: number, b: number) {
//     return '#' + [r, g, b].map((x) => {
//       const hex = x.toString(16);
//       return hex.length === 1 ? '0' + hex : hex;
//     }).join('');
//   }

//   function lighten(hex: string, amount: number = 20) {
//     const { r, g, b } = hexToRgb(hex);
//     return rgbToHex(
//       Math.min(255, r + amount),
//       Math.min(255, g + amount),
//       Math.min(255, b + amount)
//     );
//   }

//   function darken(hex: string, amount: number = 20) {
//     const { r, g, b } = hexToRgb(hex);
//     return rgbToHex(
//       Math.max(0, r - amount),
//       Math.max(0, g - amount),
//       Math.max(0, b - amount)
//     );
//   }

//   function rgba(hex: string, alpha: number) {
//     const { r, g, b } = hexToRgb(hex);
//     return `rgba(${r}, ${g}, ${b}, ${alpha})`;
//   }

//   const lighter = lighten(brandColor, 55);
//   const softer = lighten(brandColor, 25);
//   const darker = darken(brandColor, 45);
//   const deepest = darken(brandColor, 80);

//   // ─── Transparent background ───
//   ctx.clearRect(0, 0, size, size);

//   const initial = storeName.charAt(0).toUpperCase();
//   const cx = size / 2;
//   const cy = size / 2;

//   // =============================
//   // Perspective Transform (slight tilt)
//   // =============================
//   ctx.save();
//   ctx.translate(cx, cy);
//   ctx.rotate((-2 * Math.PI) / 180);
//   ctx.transform(1, -0.02, 0.026, 1, 0, 0);
//   ctx.translate(-cx, -cy);

//   // ─── Outer glow ring (enhanced volumetric) ───
//   const outerRadius = 440;
//   const glowGradient = ctx.createRadialGradient(
//     cx,
//     cy,
//     outerRadius - 40,
//     cx,
//     cy,
//     outerRadius + 20,
//   );
  
//   // Dynamic brand-colored glow
//   glowGradient.addColorStop(0, rgba(lighter, 0.9));
//   glowGradient.addColorStop(0.45, rgba(brandColor, 0.45));
//   glowGradient.addColorStop(0.7, rgba(darker, 0.15));
//   glowGradient.addColorStop(1, rgba(deepest, 0));
  
//   ctx.save();
//   ctx.filter = 'blur(90px)';
//   ctx.globalCompositeOperation = 'screen';
//   ctx.beginPath();
//   ctx.arc(cx, cy, outerRadius + 20, 0, Math.PI * 2);
//   ctx.fillStyle = glowGradient;
//   ctx.fill();
//   ctx.restore();

//   // ─── Volumetric Light Beams ───
//   function drawLightBeam(x: number, y: number, rotation: number) {
//     ctx.save();
//     ctx.translate(x, y);
//     ctx.rotate((rotation * Math.PI) / 180);

//     const beamGradient = ctx.createLinearGradient(0, -300, 0, 300);
//     beamGradient.addColorStop(0, 'rgba(255,255,255,0)');
//     beamGradient.addColorStop(0.5, 'rgba(255,255,255,0.12)');
//     beamGradient.addColorStop(1, 'rgba(255,255,255,0)');

//     ctx.fillStyle = beamGradient;
//     ctx.filter = 'blur(40px)';

//     ctx.beginPath();
//     ctx.moveTo(-50, -300);
//     ctx.lineTo(50, -300);
//     ctx.lineTo(250, 300);
//     ctx.lineTo(-250, 300);
//     ctx.closePath();
//     ctx.fill();

//     ctx.restore();
//   }

//   drawLightBeam(cx - 120, cy - 120, -25);
//   drawLightBeam(cx + 180, cy + 120, -25);

//   // ─── Main rounded square with enhanced shadow ───
//   const squareSize = 600;
//   const squareX = cx - squareSize / 2;
//   const squareY = cy - squareSize / 2;
//   const squareRadius = 120;

//   // Enhanced shadow beneath square
//   ctx.save();
//   ctx.shadowColor = "rgba(0, 0, 0, 0.25)";
//   ctx.shadowBlur = 60;
//   ctx.shadowOffsetY = 25;
//   drawRoundedSquare(ctx, squareX, squareY, squareSize, squareRadius);
//   ctx.fillStyle = "#FFFFFF";
//   ctx.fill();
//   ctx.restore();

//   // Main square fill
//   drawRoundedSquare(ctx, squareX, squareY, squareSize, squareRadius);
//   ctx.fillStyle = "#FFFFFF";
//   ctx.fill();

//   // ─── Inner cinematic gradient overlay ───
//   const overlayGradient = ctx.createLinearGradient(
//     squareX,
//     squareY,
//     squareX + squareSize,
//     squareY + squareSize,
//   );
//   overlayGradient.addColorStop(0, rgba(lighter, 0.1));
//   overlayGradient.addColorStop(0.5, rgba(brandColor, 0.03));
//   overlayGradient.addColorStop(1, rgba(darker, 0.05));
  
//   ctx.save();
//   drawRoundedSquare(ctx, squareX, squareY, squareSize, squareRadius);
//   ctx.clip();
//   ctx.fillStyle = overlayGradient;
//   ctx.fillRect(squareX, squareY, squareSize, squareSize);
//   ctx.restore();

//   // ─── Rim Light (brand-colored edge accent) ───
//   const rimGradient = ctx.createLinearGradient(
//     squareX,
//     squareY,
//     squareX + squareSize,
//     squareY + squareSize
//   );
//   rimGradient.addColorStop(0, rgba(brandColor, 0.45));
//   rimGradient.addColorStop(1, 'rgba(255,255,255,0.45)');
  
//   ctx.save();
//   drawRoundedSquare(ctx, squareX, squareY, squareSize, squareRadius);
//   ctx.strokeStyle = rimGradient;
//   ctx.lineWidth = 2;
//   ctx.stroke();
//   ctx.restore();

//   // ─── Metallic 3D letter with bevel and glass shine ───
//   ctx.save();
  
//   ctx.font = `bold 380px "Georgia", "Playfair Display", "Times New Roman", serif`;
//   ctx.textAlign = "center";
//   ctx.textBaseline = "middle";
  
//   // Metallic gradient for letter
//   const textGradient = ctx.createLinearGradient(
//     cx - 200,
//     cy - 200,
//     cx + 200,
//     cy + 200
//   );
//   textGradient.addColorStop(0, brandColor);
//   textGradient.addColorStop(0.25, lighter);
//   textGradient.addColorStop(0.5, '#FFFFFF');
//   textGradient.addColorStop(0.75, softer);
//   textGradient.addColorStop(1, darker);
  
//   // Neon glow behind letter
//   ctx.shadowColor = rgba(brandColor, 0.85);
//   ctx.shadowBlur = 35;
  
//   // Ambient depth shadow (offset)
//   ctx.fillStyle = rgba(deepest, 0.25);
//   ctx.fillText(initial, cx + 8, cy + 10);
  
//   // Highlight bevel (top-left light)
//   ctx.fillStyle = 'rgba(255,255,255,0.7)';
//   ctx.filter = 'blur(1px)';
//   ctx.fillText(initial, cx - 4, cy - 4);
  
//   // Main metallic letter body
//   ctx.filter = 'none';
//   ctx.fillStyle = textGradient;
//   ctx.fillText(initial, cx, cy);
  
//   // Glass shine overlay streak
//   const shineGradient = ctx.createLinearGradient(
//     cx - 150,
//     cy - 150,
//     cx + 150,
//     cy + 150
//   );
//   shineGradient.addColorStop(0, 'rgba(255,255,255,0.22)');
//   shineGradient.addColorStop(1, 'rgba(255,255,255,0)');
  
//   ctx.globalCompositeOperation = 'screen';
//   ctx.fillStyle = shineGradient;
//   ctx.beginPath();
//   ctx.ellipse(cx - 40, cy - 90, 150, 60, -0.4, 0, Math.PI * 2);
//   ctx.fill();
  
//   ctx.restore();

//   // ─── Brand-colored accent orb (neon glow) ───
//   const dotRadius = 38;
//   const dotX = cx + squareSize * 0.28;
//   const dotY = cy - squareSize * 0.28;
  
//   const orbGradient = ctx.createRadialGradient(
//     dotX,
//     dotY,
//     0,
//     dotX,
//     dotY,
//     80
//   );
//   orbGradient.addColorStop(0, rgba(lighter, 1));
//   orbGradient.addColorStop(0.45, rgba(brandColor, 0.95));
//   orbGradient.addColorStop(1, rgba(brandColor, 0));
  
//   ctx.save();
//   ctx.filter = 'blur(2px)';
//   ctx.shadowColor = rgba(brandColor, 0.9);
//   ctx.shadowBlur = 40;
//   ctx.beginPath();
//   ctx.arc(dotX, dotY, dotRadius, 0, Math.PI * 2);
//   ctx.fillStyle = orbGradient;
//   ctx.fill();
//   ctx.restore();

//   // ─── Brand-colored line accent with glow ───
//   const lineWidth = 80;
//   const lineHeight = 6;
//   const lineY = cy + squareSize * 0.32;
  
//   const lineGradient = ctx.createLinearGradient(
//     cx - 40,
//     cy + 210,
//     cx + 40,
//     cy + 210
//   );
//   lineGradient.addColorStop(0, lighter);
//   lineGradient.addColorStop(0.5, brandColor);
//   lineGradient.addColorStop(1, darker);
  
//   ctx.save();
//   ctx.shadowColor = rgba(brandColor, 0.7);
//   ctx.shadowBlur = 18;
//   ctx.beginPath();
//   ctx.roundRect(cx - lineWidth / 2, lineY, lineWidth, lineHeight, 3);
//   ctx.fillStyle = lineGradient;
//   ctx.fill();
//   ctx.restore();

//   // ─── Tiny decorative dots ───
//   const tinyDots = [
//     { x: cx - squareSize * 0.35, y: cy + squareSize * 0.1 },
//     { x: cx + squareSize * 0.38, y: cy - squareSize * 0.15 },
//     { x: cx - squareSize * 0.1, y: cy - squareSize * 0.35 },
//   ];
//   tinyDots.forEach(({ x, y }) => {
//     ctx.beginPath();
//     ctx.arc(x, y, 5, 0, Math.PI * 2);
//     ctx.fillStyle = brandColor + "50";
//     ctx.fill();
//   });

//   // ─── Vignette Overlay (darkens edges for depth) ───
//   const vignette = ctx.createRadialGradient(
//     cx,
//     cy,
//     squareSize * 0.25,
//     cx,
//     cy,
//     squareSize * 0.9
//   );
//   vignette.addColorStop(0, 'rgba(0,0,0,0)');
//   vignette.addColorStop(1, 'rgba(0,0,0,0.28)');
  
//   ctx.save();
//   ctx.globalCompositeOperation = 'multiply';
//   ctx.fillStyle = vignette;
//   ctx.fillRect(0, 0, size, size);
//   ctx.restore();

//   // ─── Depth of Field Soft Blur Ring ───
//   ctx.save();
//   ctx.globalCompositeOperation = 'screen';
//   ctx.filter = 'blur(120px)';
//   ctx.strokeStyle = rgba(lighter, 0.08);
//   ctx.lineWidth = 120;
//   drawRoundedSquare(ctx, squareX, squareY, squareSize, squareRadius);
//   ctx.stroke();
//   ctx.restore();

//   // Restore perspective transform
//   ctx.restore();

//   return new Promise((resolve, reject) => {
//     canvas.toBlob(
//       (blob) => {
//         if (blob) resolve(blob);
//         else reject(new Error("Failed to generate icon"));
//       },
//       "image/png",
//       1.0,
//     );
//   });
// }

// /**
//  * Helper: Draws a rounded square path on the canvas.
//  */
// function drawRoundedSquare(
//   ctx: CanvasRenderingContext2D,
//   x: number,
//   y: number,
//   size: number,
//   radius: number,
// ) {
//   ctx.beginPath();
//   ctx.moveTo(x + radius, y);
//   ctx.lineTo(x + size - radius, y);
//   ctx.quadraticCurveTo(x + size, y, x + size, y + radius);
//   ctx.lineTo(x + size, y + size - radius);
//   ctx.quadraticCurveTo(x + size, y + size, x + size - radius, y + size);
//   ctx.lineTo(x + radius, y + size);
//   ctx.quadraticCurveTo(x, y + size, x, y + size - radius);
//   ctx.lineTo(x, y + radius);
//   ctx.quadraticCurveTo(x, y, x + radius, y);
//   ctx.closePath();
// }
