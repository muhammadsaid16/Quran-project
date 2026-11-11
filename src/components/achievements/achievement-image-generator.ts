/**
 * Generates a high-resolution, beautifully branded 1200x675 PNG share card
 * for an achievement using the HTML5 Canvas 2D API.
 */

export interface GenerateShareCardOptions {
  title: string;
  description: string;
  tier: 'bronze' | 'silver' | 'gold' | 'diamond';
  tierLabel: string;
  unlockedAt?: string | Date;
  appName?: string;
  categoryLabel?: string;
}

const TIER_COLORS = {
  bronze: {
    primary: '#D97706',
    secondary: '#B45309',
    glow: 'rgba(217, 119, 6, 0.35)',
    gradientStart: '#78350F',
    gradientEnd: '#451A03',
  },
  silver: {
    primary: '#94A3B8',
    secondary: '#64748B',
    glow: 'rgba(148, 163, 184, 0.35)',
    gradientStart: '#334155',
    gradientEnd: '#1E293B',
  },
  gold: {
    primary: '#F59E0B',
    secondary: '#D97706',
    glow: 'rgba(245, 158, 11, 0.45)',
    gradientStart: '#854D0E',
    gradientEnd: '#422006',
  },
  diamond: {
    primary: '#06B6D4',
    secondary: '#0891B2',
    glow: 'rgba(6, 182, 212, 0.45)',
    gradientStart: '#164E63',
    gradientEnd: '#083344',
  },
};

export async function generateAchievementCardPNG(
  options: GenerateShareCardOptions
): Promise<Blob> {
  const {
    title,
    description,
    tier,
    tierLabel,
    unlockedAt,
    appName = 'باب الإتقان',
  } = options;

  const canvas = document.createElement('canvas');
  const width = 1200;
  const height = 675;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2d canvas context');

  const theme = TIER_COLORS[tier] || TIER_COLORS.gold;

  // 1. Deep Dark Background
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#0B0F17');
  bgGrad.addColorStop(0.5, '#121A29');
  bgGrad.addColorStop(1, '#080C14');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Center Radial Glow matching Tier
  const radialGlow = ctx.createRadialGradient(
    width / 2,
    height / 2 - 20,
    30,
    width / 2,
    height / 2 - 20,
    360
  );
  radialGlow.addColorStop(0, theme.glow);
  radialGlow.addColorStop(1, 'transparent');
  ctx.fillStyle = radialGlow;
  ctx.fillRect(0, 0, width, height);

  // 3. Elegant Outer Ornate Border
  ctx.save();
  ctx.strokeStyle = 'rgba(227, 220, 185, 0.18)';
  ctx.lineWidth = 2;
  ctx.strokeRect(36, 36, width - 72, height - 72);

  // Inner decorative border
  ctx.strokeStyle = theme.primary;
  ctx.lineWidth = 1;
  ctx.strokeRect(44, 44, width - 88, height - 88);

  // Corner Accents
  const cornerSize = 24;
  const corners = [
    [44, 44],
    [width - 44, 44],
    [44, height - 44],
    [width - 44, height - 44],
  ];
  ctx.fillStyle = theme.primary;
  corners.forEach(([cx, cy]) => {
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();

  // 4. Header: App Name & Subtitle
  ctx.save();
  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#E2E8F0';
  ctx.font = 'bold 28px "IBM Plex Sans Arabic", "Cairo", sans-serif';
  ctx.fillText(appName, width / 2, 95);

  ctx.fillStyle = '#94A3B8';
  ctx.font = '15px "IBM Plex Sans Arabic", "Inter", sans-serif';
  ctx.fillText('منصة باب الإتقان • نظام الاسترجاع النشط والتسميع الصوتي المتقن', width / 2, 125);
  ctx.restore();

  // 5. Tier Badge (Medal Pill)
  ctx.save();
  ctx.textAlign = 'center';
  ctx.direction = 'rtl';

  // Pill Background
  const pillWidth = 160;
  const pillHeight = 36;
  const pillX = (width - pillWidth) / 2;
  const pillY = 170;
  ctx.fillStyle = theme.primary;
  ctx.beginPath();
  ctx.roundRect(pillX, pillY, pillWidth, pillHeight, 18);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 16px "IBM Plex Sans Arabic", "Cairo", sans-serif';
  ctx.fillText(`وسام ${tierLabel}`, width / 2, pillY + 24);
  ctx.restore();

  // 6. Central Achievement Medal Symbol
  ctx.save();
  const medalCenterY = 275;
  const medalRadius = 45;

  // Medal circle shadow / glow
  ctx.shadowColor = theme.primary;
  ctx.shadowBlur = 25;
  ctx.fillStyle = theme.gradientStart;
  ctx.beginPath();
  ctx.arc(width / 2, medalCenterY, medalRadius, 0, Math.PI * 2);
  ctx.fill();

  // Medal inner ring
  ctx.shadowBlur = 0;
  ctx.strokeStyle = theme.primary;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(width / 2, medalCenterY, medalRadius - 6, 0, Math.PI * 2);
  ctx.stroke();

  // Star / Trophy inside medal
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '36px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🏆', width / 2, medalCenterY);
  ctx.restore();

  // 7. Achievement Title in Large Gold/Bright Typography
  ctx.save();
  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#F8FAFC';
  ctx.font = 'bold 44px "IBM Plex Sans Arabic", "Cairo", sans-serif';
  ctx.fillText(`« ${title} »`, width / 2, 385);

  // 8. Achievement Description
  ctx.fillStyle = '#CBD5E1';
  ctx.font = '20px "IBM Plex Sans Arabic", "Cairo", sans-serif';
  // Simple word wrapping for description
  wrapText(ctx, description, width / 2, 440, 850, 32);
  ctx.restore();

  // 9. Footer: Verification, Date & App Watermark
  ctx.save();
  ctx.direction = 'rtl';
  ctx.textAlign = 'center';

  // Divider Line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(180, 560);
  ctx.lineTo(width - 180, 560);
  ctx.stroke();

  const formattedDate = unlockedAt
    ? new Date(unlockedAt).toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : new Date().toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

  ctx.fillStyle = '#10B981';
  ctx.font = 'bold 16px "IBM Plex Sans Arabic", "Cairo", sans-serif';
  ctx.fillText(`✓ تم الإنجاز والتوثيق بنجاح • ${formattedDate}`, width / 2, 600);

  ctx.fillStyle = '#64748B';
  ctx.font = '13px "IBM Plex Sans Arabic", "Inter", sans-serif';
  ctx.fillText('تم التوليد بواسطة منصة مصحف الحفظ والاسترجاع (FSRS Memory Engine)', width / 2, 626);
  ctx.restore();

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas toBlob failed'));
    }, 'image/png');
  });
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.split(' ');
  let line = '';
  let curY = y;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line.trim(), x, curY);
      line = words[n] + ' ';
      curY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line.trim(), x, curY);
}
