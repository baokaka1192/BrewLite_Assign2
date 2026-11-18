import { ImageResponse } from 'next/og';

export const alt = 'BrewLite — Specialty coffee, ordered in a few taps';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 80px',
          background: '#964F2C',
          color: '#FCFBF8',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: '#E8AB30',
              display: 'flex',
            }}
          />
          <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: 1 }}>BrewLite</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ fontSize: 84, fontWeight: 700, lineHeight: 1.05 }}>
            Specialty coffee,
          </div>
          <div style={{ fontSize: 84, fontWeight: 700, lineHeight: 1.05, color: '#E8AB30' }}>
            ordered in a few taps.
          </div>
          <div style={{ fontSize: 30, color: '#F7F4ED', marginTop: 12 }}>
            Order and pay without cash. Pick up at the bar.
          </div>
        </div>

        <div style={{ display: 'flex', height: 6, width: '100%', background: '#E8AB30' }} />
      </div>
    ),
    { ...size },
  );
}
