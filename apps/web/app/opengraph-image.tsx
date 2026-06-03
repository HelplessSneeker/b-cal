import { ImageResponse } from 'next/og';

// Route segment config
export const alt = 'b-cal — Calendar App';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Brand colours (hex approximations of the OKLch design tokens in globals.css)
const NAVY = '#161b2b';
const NAVY_DARK = '#0e1119';
const ACCENT = '#4f46e5';
const FG = '#f7f8fa';
const MUTED = '#9aa3b8';

// Static social-share preview. Used automatically by Next.js for
// og:image / twitter:image when this link is shared (LinkedIn, WhatsApp, …).
export default function OpengraphImage() {
  const weekdays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  // 5 rows × 7 cols mini month grid; highlight one day as the "event".
  const days = Array.from({ length: 35 }, (_, i) => i + 1 - 2); // start offset
  const highlighted = 14;

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '88px',
        background: `linear-gradient(135deg, ${NAVY} 0%, ${NAVY_DARK} 100%)`,
        fontFamily: 'sans-serif',
      }}
    >
      {/* Left: wordmark + tagline */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '18px',
            marginBottom: '28px',
          }}
        >
          <div
            style={{
              width: '20px',
              height: '64px',
              borderRadius: '6px',
              background: ACCENT,
            }}
          />
          <div
            style={{
              fontSize: '116px',
              fontWeight: 700,
              color: FG,
              letterSpacing: '-0.04em',
              lineHeight: 1,
            }}
          >
            b-cal
          </div>
        </div>
        <div
          style={{
            fontSize: '40px',
            color: MUTED,
            fontWeight: 500,
            letterSpacing: '-0.01em',
          }}
        >
          Your calendar, sharper.
        </div>
      </div>

      {/* Right: mini calendar card */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '420px',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: '28px',
          padding: '32px',
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: '24px',
            color: MUTED,
            fontWeight: 600,
            marginBottom: '18px',
            justifyContent: 'space-between',
          }}
        >
          {weekdays.map((d, i) => (
            <div key={i} style={{ width: '44px', textAlign: 'center' }}>
              {d}
            </div>
          ))}
        </div>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            width: '356px',
          }}
        >
          {days.map((d, i) => {
            const valid = d >= 1 && d <= 30;
            const isEvent = d === highlighted;
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '44px',
                  height: '52px',
                  margin: '3px 0',
                  fontSize: '24px',
                  fontWeight: isEvent ? 700 : 500,
                  color: isEvent ? FG : valid ? '#c7cdda' : 'transparent',
                }}
              >
                {isEvent ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '46px',
                      height: '46px',
                      borderRadius: '12px',
                      background: ACCENT,
                    }}
                  >
                    {d}
                  </div>
                ) : valid ? (
                  String(d)
                ) : (
                  ''
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>,
    { ...size },
  );
}
