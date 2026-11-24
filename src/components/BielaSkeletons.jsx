import './Skeletons.css';

function Bar({ width = '100%', height = 12, radius = 999, className = '' }) {
  return (
    <span
      className={`biela-skeleton ${className}`.trim()}
      style={{ width, height, borderRadius: radius }}
    />
  );
}

export function GarageSkeleton() {
  return (
    <div className="biela-skeleton-page biela-skeleton-garage" aria-hidden="true">
      <div className="biela-skeleton-header">
        <div className="biela-skeleton-stack">
          <Bar width="58%" height={26} radius={8} />
          <Bar width="76%" height={10} />
        </div>
        <Bar width={82} height={38} radius={999} />
      </div>

      {[0, 1].map((item) => (
        <div className="biela-skeleton-card" key={item}>
          <span className="biela-skeleton biela-skeleton-vehicle" />
          <div className="biela-skeleton-card-body">
            <div className="biela-skeleton-center">
              <Bar width="64%" height={22} radius={7} />
              <Bar width={64} height={22} radius={999} />
            </div>
            <div className="biela-skeleton-stats">
              <div className="biela-skeleton-stat">
                <Bar width="48%" height={9} />
                <Bar width="74%" height={22} radius={6} />
              </div>
              <div className="biela-skeleton-stat">
                <Bar width="40%" height={9} />
                <Bar width="82%" height={16} radius={6} />
              </div>
            </div>
            <Bar height={44} radius={12} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function MotoDetailSkeleton() {
  return (
    <div className="biela-skeleton-page biela-skeleton-detail" aria-hidden="true">
      <header className="biela-skeleton-detail-header">
        <Bar width={78} height={20} radius={999} />
        <Bar width="38%" height={18} radius={6} />
        <Bar width={26} height={26} radius={999} />
      </header>

      <main className="biela-skeleton-detail-main">
        <div className="biela-skeleton-summary">
          <span className="biela-skeleton biela-skeleton-summary-image" />
          <div className="biela-skeleton-summary-content">
            <div className="biela-skeleton-metric">
              <Bar width="42%" height={9} />
              <Bar width="78%" height={32} radius={7} />
              <Bar width={48} height={12} radius={999} />
            </div>
            <div className="biela-skeleton-metric biela-skeleton-metric-right">
              <Bar width="52%" height={9} />
              <Bar width="72%" height={28} radius={7} />
              <Bar width={90} height={22} radius={999} />
            </div>
          </div>
        </div>

        <section className="biela-skeleton-section">
          <Bar width="34%" height={18} radius={6} />
          <div className="biela-skeleton-diagram">
            <span className="biela-skeleton biela-skeleton-wheel biela-skeleton-wheel-left" />
            <span className="biela-skeleton biela-skeleton-wheel biela-skeleton-wheel-right" />
            <Bar className="biela-skeleton-chassis" width="58%" height={10} radius={999} />
            <Bar className="biela-skeleton-tank" width="30%" height={30} radius={12} />
            <Bar className="biela-skeleton-engine" width="22%" height={42} radius={8} />
          </div>
        </section>

        <section className="biela-skeleton-section">
          <div className="biela-skeleton-section-head">
            <Bar width="30%" height={18} radius={6} />
            <Bar width={64} height={22} radius={999} />
          </div>
          <div className="biela-skeleton-fuel">
            {[0, 1, 2].map((item) => (
              <div className="biela-skeleton-fuel-card" key={item}>
                <Bar width="56%" height={24} radius={6} />
                <Bar width="82%" height={9} />
                <Bar width="64%" height={9} />
              </div>
            ))}
          </div>
        </section>

        <section className="biela-skeleton-section">
          <div className="biela-skeleton-section-head">
            <Bar width="28%" height={18} radius={6} />
            <Bar width={74} height={32} radius={10} />
          </div>
          {[0, 1].map((item) => (
            <div className="biela-skeleton-service-row" key={item}>
              <span className="biela-skeleton biela-skeleton-service-icon" />
              <div className="biela-skeleton-service-copy">
                <Bar width="58%" height={14} radius={5} />
                <Bar width="40%" height={9} />
              </div>
              <div className="biela-skeleton-service-kms">
                <Bar width={70} height={9} />
                <Bar width={92} height={16} radius={5} />
              </div>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="biela-skeleton-page biela-skeleton-profile" aria-hidden="true">
      <header className="biela-skeleton-profile-header">
        <Bar width={24} height={24} radius={999} />
        <Bar width="36%" height={18} radius={6} />
        <Bar width={24} height={24} radius={999} />
      </header>

      <main className="biela-skeleton-profile-main">
        <div className="biela-skeleton-profile-identity">
          <span className="biela-skeleton biela-skeleton-avatar" />
          <div className="biela-skeleton-identity-copy">
            <Bar width="64%" height={20} radius={6} />
            <Bar width="44%" height={10} />
          </div>
        </div>

        <div className="biela-skeleton-profile-card">
          {[0, 1, 2, 3].map((item) => (
            <div className="biela-skeleton-field" key={item}>
              <Bar width="30%" height={9} />
              <Bar height={46} radius={12} />
            </div>
          ))}
          <Bar height={48} radius={12} />
        </div>
      </main>
    </div>
  );
}

const mapPins = [
  { top: '28%', left: '18%', size: 44 },
  { top: '42%', left: '62%', size: 40 },
  { top: '68%', left: '36%', size: 38 },
  { top: '74%', left: '78%', size: 46 },
];

export function MapSkeleton() {
  return (
    <div className="biela-skeleton-map" aria-hidden="true">
      <span className="biela-skeleton-map-road biela-skeleton-map-road-one" />
      <span className="biela-skeleton-map-road biela-skeleton-map-road-two" />
      <span className="biela-skeleton-map-road biela-skeleton-map-road-three" />

      {mapPins.map((pin, index) => (
        <span
          className="biela-skeleton biela-skeleton-pin"
          key={index}
          style={{ top: pin.top, left: pin.left, width: pin.size, height: pin.size }}
        />
      ))}

      <div className="biela-skeleton-map-card">
        <Bar width="72%" height={14} radius={6} />
        <Bar width="92%" height={9} />
        <Bar width="58%" height={9} />
      </div>
    </div>
  );
}

export function TiendasSkeleton() {
  return (
    <div className="biela-skeleton-page mx-auto w-full max-w-6xl px-4 pb-28 pt-8" aria-hidden="true">
      <div className="flex flex-col gap-3">
        <Bar width="min(18rem, 72%)" height={28} radius={8} />
        <Bar width="min(26rem, 92%)" height={10} />
      </div>

      <div className="mt-7 flex gap-3">
        <Bar height={48} radius={14} />
        <Bar width={92} height={48} radius={14} />
      </div>

      <div className="mt-5 flex gap-2 overflow-hidden">
        {[84, 96, 88, 74, 68].map((width, index) => (
          <Bar key={index} width={width} height={34} radius={999} />
        ))}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((item) => (
          <div
            key={item}
            className="flex min-h-[236px] flex-col gap-4 rounded-2xl border p-4"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
          >
            <div className="flex items-center justify-between gap-2">
              <Bar width="58%" height={18} radius={6} />
              <Bar width={64} height={20} radius={999} />
            </div>
            <Bar width={92} height={22} radius={999} />
            <Bar width="88%" height={9} />
            <Bar width="72%" height={9} />
            <Bar width="64%" height={9} />
            <div className="mt-auto">
              <Bar height={48} radius={12} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
