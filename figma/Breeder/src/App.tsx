import { useState } from 'react'

// ─── Data ────────────────────────────────────────────────────────────────────

const SAMPLE_BREEDER = {
  id: '1',
  name: 'Cattery Miu House',
  location: 'Quận 7, TP.HCM',
  species: 'Mèo',
  breeds: 'British Shorthair, Scottish Fold',
  type: 'home_breeder',
  typeLabel: 'Hộ gia đình nuôi sinh sản nhỏ',
  score: 78,
  level: 'L2',
  levelLabel: 'Đáng tin cậy',
  listings: 6,
  scale: '4–10 bé',
  reports: 0,
  verified: true,
  bio: 'Chúng mình nuôi British Shorthair và Scottish Fold thuần chủng từ 2018. Tất cả các bé đều được tiêm phòng đầy đủ, xổ giun định kỳ và kiểm tra sức khoẻ trước khi về nhà mới.',
  careEnv: 'Không gian thoáng rộng, được vệ sinh hàng ngày. Thức ăn hạt chất lượng cao kết hợp pate. Thú y định kỳ mỗi 3 tháng.',
  signals: [
    { key: 'verified', label: 'Đã xác minh', max: 30, earned: 30, done: true },
    { key: 'careChecklist', label: 'Checklist chăm sóc', max: 15, earned: 15, done: true },
    { key: 'commitments', label: 'Cam kết minh bạch', max: 15, earned: 15, done: true },
    { key: 'contact', label: 'Thông tin liên hệ', max: 15, earned: 15, done: true },
    { key: 'careEnvironment', label: 'Môi trường chăm sóc', max: 15, earned: 15, done: true },
    { key: 'activeListings', label: 'Tin đăng hoạt động', max: 10, earned: 8, done: false },
  ],
  checklist: ['Tiêm phòng đầy đủ', 'Xổ giun định kỳ', 'Khám thú y trước khi giao', 'Hợp đồng mua bán'],
  commitments: ['Cam kết cung cấp thông tin trung thực', 'Hỗ trợ tư vấn sau khi về nhà mới'],
}

const BREEDERS = [
  { ...SAMPLE_BREEDER, id: '1', rank: 1 },
  {
    id: '2', rank: 2, name: 'Kennel Saigon Paws', location: 'Bình Thạnh, TP.HCM',
    species: 'Chó', breeds: 'Golden Retriever, Labrador', type: 'registered_kennel',
    typeLabel: 'Trại đăng ký chính thức', score: 91, level: 'L3', levelLabel: 'Đối tác nổi bật',
    listings: 12, scale: '10–20 bé', reports: 0, verified: true,
    bio: '', careEnv: '', signals: [], checklist: [], commitments: [],
  },
  {
    id: '3', rank: 3, name: 'Rescue Paws Hanoi', location: 'Cầu Giấy, Hà Nội',
    species: 'Mèo', breeds: 'Mixed, Tabby', type: 'rescue_foster',
    typeLabel: 'Cứu hộ / foster', score: 65, level: 'L1', levelLabel: 'Đang xây dựng',
    listings: 4, scale: '1–3 bé', reports: 0, verified: true,
    bio: '', careEnv: '', signals: [], checklist: [], commitments: [],
  },
  {
    id: '4', rank: 4, name: 'Pomeranian Kingdom', location: 'Đống Đa, Hà Nội',
    species: 'Chó', breeds: 'Pomeranian', type: 'home_breeder',
    typeLabel: 'Hộ gia đình nuôi sinh sản nhỏ', score: 55, level: 'L1', levelLabel: 'Đang xây dựng',
    listings: 3, scale: '4–10 bé', reports: 0, verified: true,
    bio: '', careEnv: '', signals: [], checklist: [], commitments: [],
  },
]

const LISTINGS = [
  { id: 'p1', title: 'Bé British Shorthair xanh xám 3 tháng', price: '4.500.000đ', gender: 'Đực', age: '3 tháng', img: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=200&h=200&fit=crop&auto=format' },
  { id: 'p2', title: 'Scottish Fold tai cụp vàng nâu 4 tháng', price: '6.000.000đ', gender: 'Cái', age: '4 tháng', img: 'https://images.unsplash.com/photo-1533743983669-94fa5c4338ec?w=200&h=200&fit=crop&auto=format' },
  { id: 'p3', title: 'British Shorthair trắng sữa 2.5 tháng', price: '5.200.000đ', gender: 'Đực', age: '2.5 tháng', img: 'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=200&h=200&fit=crop&auto=format' },
]

const TEMPLATES = [
  { id: 'T1', name: 'Tối giản tin cậy', nameEn: 'Trust Minimal', desc: 'Gọn, metric rõ, tập trung vào điểm tin cậy', fit: 'Hộ gia đình, lần đầu', color: '#1E6FE8' },
  { id: 'T2', name: 'Trại có ảnh bìa', nameEn: 'Cover Farm', desc: 'Ảnh môi trường full-bleed, ấn tượng trực quan', fit: 'Kennel có ảnh', color: '#0F172A' },
  { id: 'T3', name: 'Ưu tiên tin đăng', nameEn: 'Listings First', desc: 'Hero compact, tin đăng hiện ngay', fit: 'Breeder nhiều tin', color: '#7C3AED' },
  { id: 'T4', name: 'Cứu hộ / Foster', nameEn: 'Rescue Soft', desc: 'Ấm, nhấn cam kết và câu chuyện', fit: 'Rescue, foster', color: '#059669' },
  { id: 'T5', name: 'Kennel đăng ký', nameEn: 'Registered Kennel', desc: 'Chuyên nghiệp, credentials nổi bật', fit: 'Trại đăng ký', color: '#B45309' },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function levelColor(level: string) {
  if (level === 'L3') return { bg: '#D1FAE5', text: '#065F46', dot: '#059669' }
  if (level === 'L2') return { bg: '#DBEAFE', text: '#1E40AF', dot: '#1E6FE8' }
  if (level === 'L1') return { bg: '#FEF3C7', text: '#92400E', dot: '#D97706' }
  return { bg: '#F1F5F9', text: '#475569', dot: '#94A3B8' }
}

function scoreColor(score: number) {
  if (score >= 90) return '#059669'
  if (score >= 70) return '#1E6FE8'
  if (score >= 40) return '#D97706'
  return '#94A3B8'
}

function initials(name: string) {
  return name.split(' ').slice(-2).map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

// ─── Shared micro-components ──────────────────────────────────────────────────

function VerifiedBadge({ dark = false }: { dark?: boolean }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: dark ? 'rgba(6,78,59,0.9)' : '#D1FAE5', color: dark ? '#6EE7B7' : '#065F46', borderRadius: 999, padding: '2px 8px', fontSize: 11, fontWeight: 600, backdropFilter: dark ? 'blur(4px)' : 'none' }}>
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke={dark ? '#6EE7B7' : '#059669'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      Đã xác minh
    </span>
  )
}

function TrustLevelChip({ level, label, invert = false }: { level: string; label: string; invert?: boolean }) {
  const c = levelColor(level)
  if (invert) return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.18)', color: '#fff', borderRadius: 999, padding: '3px 10px', fontSize: 11, fontWeight: 600 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', display: 'inline-block', opacity: 0.7 }} />
      {label}
    </span>
  )
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: c.bg, color: c.text, borderRadius: 999, padding: '3px 10px', fontSize: 11, fontWeight: 600 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.dot, display: 'inline-block' }} />
      {label}
    </span>
  )
}

function MetricMini({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, color: '#0F172A', fontWeight: 700 }}>{value}</div>
    </div>
  )
}

function DisclaimerBanner() {
  return (
    <div style={{ margin: '0 16px 12px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, padding: '10px 12px', display: 'flex', gap: 8 }}>
      <span style={{ fontSize: 14, flexShrink: 0 }}>⚠️</span>
      <p style={{ margin: 0, fontSize: 11, color: '#92400E', lineHeight: 1.5 }}>
        Tin đăng do người dùng đăng. Pet Health Care không phải bên bán, không xử lý thanh toán và không bảo lãnh sức khoẻ thú.
      </p>
    </div>
  )
}

// ─── Score Ring SVG ───────────────────────────────────────────────────────────

function ScoreRing({ score, size = 72, color = '#fff', trackColor = 'rgba(255,255,255,0.2)', textColor = '#fff' }: {
  score: number; size?: number; color?: string; trackColor?: string; textColor?: string
}) {
  const r = (size / 2) - 7
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={trackColor} strokeWidth="6" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: size * 0.28, fontWeight: 800, color: textColor, lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: size * 0.14, color: textColor, opacity: 0.65 }}>/100</span>
      </div>
    </div>
  )
}

// ─── Template Hero Variants ───────────────────────────────────────────────────

function HeroT1({ b }: { b: typeof SAMPLE_BREEDER }) {
  // Trust Minimal — asymmetric blue, score ring prominent right, identity left
  return (
    <div style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(145deg, #1A5FCC 0%, #1E6FE8 45%, #2563EB 100%)', paddingBottom: 0 }}>
      {/* Decorative circles */}
      <div style={{ position: 'absolute', top: -30, right: -30, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
      <div style={{ position: 'absolute', bottom: -20, left: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />

      {/* Top row: identity + score ring */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 20px 0' }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', flex: 1, minWidth: 0 }}>
          {/* Avatar */}
          <div style={{ width: 58, height: 58, borderRadius: 18, background: 'rgba(255,255,255,0.18)', border: '2px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 20, color: '#fff', flexShrink: 0, backdropFilter: 'blur(8px)' }}>
            {initials(b.name)}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#fff', lineHeight: 1.2, marginBottom: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name}</div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 5 }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>📍 {b.location}</span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>·</span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>🐾 {b.species}</span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <VerifiedBadge dark />
              <TrustLevelChip level={b.level} label={b.levelLabel} invert />
            </div>
          </div>
        </div>
        {/* Score ring */}
        <ScoreRing score={b.score} size={76} color="rgba(255,255,255,0.9)" trackColor="rgba(255,255,255,0.15)" textColor="#fff" />
      </div>

      {/* Metric strip */}
      <div style={{ display: 'flex', gap: 8, padding: '14px 20px 20px' }}>
        {[
          { label: 'Loại hình', value: 'Hộ gia đình' },
          { label: 'Quy mô', value: b.scale },
          { label: 'Tin đăng', value: `${b.listings} bài` },
        ].map(m => (
          <div key={m.label} style={{ flex: 1, background: 'rgba(255,255,255,0.12)', borderRadius: 10, padding: '8px 10px', backdropFilter: 'blur(4px)' }}>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{m.label}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{m.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function HeroT2({ b }: { b: typeof SAMPLE_BREEDER }) {
  // Cover Farm — full-bleed photo, bottom overlay, avatar floating bottom-left
  return (
    <div style={{ position: 'relative', height: 220, overflow: 'hidden' }}>
      {/* Cover photo */}
      <img
        src="https://images.unsplash.com/photo-1517331156700-3c241d2b4d83?w=800&h=440&fit=crop&auto=format"
        alt="Môi trường nuôi tại trại"
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
      {/* Gradient scrim */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.1) 40%, rgba(0,0,0,0.72) 100%)' }} />

      {/* Score badge top-right */}
      <div style={{ position: 'absolute', top: 12, right: 14, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(10px)', borderRadius: 12, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6, border: '1px solid rgba(255,255,255,0.15)' }}>
        <ScoreRing score={b.score} size={36} color={scoreColor(b.score)} trackColor="rgba(255,255,255,0.15)" textColor="#fff" />
        <div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Tin cậy</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>{b.levelLabel}</div>
        </div>
      </div>

      {/* Bottom identity */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 16px 16px', display: 'flex', alignItems: 'flex-end', gap: 12 }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, border: '3px solid rgba(255,255,255,0.9)', background: 'linear-gradient(135deg, #1E6FE8, #3B82F6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18, color: '#fff', flexShrink: 0 }}>
          {initials(b.name)}
        </div>
        <div style={{ flex: 1, minWidth: 0, paddingBottom: 2 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', lineHeight: 1.2, marginBottom: 4, textShadow: '0 1px 6px rgba(0,0,0,0.3)' }}>{b.name}</div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <VerifiedBadge dark />
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)' }}>📍 {b.location} · {b.species}</span>
          </div>
        </div>
      </div>

      {/* Listings count chip at top-left */}
      <div style={{ position: 'absolute', top: 12, left: 14, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)', borderRadius: 999, padding: '4px 10px', border: '1px solid rgba(255,255,255,0.15)' }}>
        <span style={{ fontSize: 11, color: '#fff', fontWeight: 600 }}>🐾 {b.listings} tin đăng</span>
      </div>
    </div>
  )
}

function HeroT3({ b }: { b: typeof SAMPLE_BREEDER }) {
  // Listings First — ultra compact white header, score badge inline
  return (
    <div style={{ background: '#fff', borderBottom: '1px solid #E2E8F0' }}>
      {/* Thin accent bar */}
      <div style={{ height: 3, background: 'linear-gradient(90deg, #7C3AED, #A78BFA)' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px' }}>
        {/* Avatar small */}
        <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg, #7C3AED, #A78BFA)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, color: '#fff', flexShrink: 0 }}>
          {initials(b.name)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name}</span>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <VerifiedBadge />
            <span style={{ fontSize: 11, color: '#94A3B8' }}>{b.location} · {b.species}</span>
          </div>
        </div>
        {/* Score pill */}
        <div style={{ flexShrink: 0, textAlign: 'center', background: '#F5F3FF', borderRadius: 14, padding: '8px 12px', border: '1px solid #EDE9FE' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#7C3AED', lineHeight: 1 }}>{b.score}</div>
          <div style={{ fontSize: 9, color: '#A78BFA', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>/ 100</div>
        </div>
      </div>
      {/* Subtitle row */}
      <div style={{ padding: '0 20px 12px', display: 'flex', gap: 6 }}>
        <TrustLevelChip level={b.level} label={b.levelLabel} />
        <span style={{ display: 'inline-flex', alignItems: 'center', background: '#F5F3FF', color: '#7C3AED', borderRadius: 999, padding: '3px 10px', fontSize: 11, fontWeight: 600 }}>
          📋 {b.listings} tin đăng
        </span>
      </div>
    </div>
  )
}

function HeroT4({ b }: { b: typeof SAMPLE_BREEDER }) {
  // Rescue Soft — warm emerald gradient, story-first, heart/paw watermark
  return (
    <div style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(150deg, #ECFDF5 0%, #D1FAE5 50%, #A7F3D0 100%)', padding: '20px 20px 0' }}>
      {/* Watermark paw */}
      <div style={{ position: 'absolute', right: -20, top: -10, fontSize: 110, opacity: 0.08, transform: 'rotate(15deg)', lineHeight: 1 }}>🐾</div>

      {/* Rescue badge */}
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#059669', color: '#fff', borderRadius: 999, padding: '5px 14px', fontSize: 12, fontWeight: 700, marginBottom: 14 }}>
        <span>♡</span>
        <span>Cứu hộ / Foster</span>
      </div>

      {/* Identity — centered feel */}
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 16 }}>
        {/* Large rounded avatar */}
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, #059669, #34D399)', border: '3px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 22, color: '#fff', flexShrink: 0, boxShadow: '0 4px 12px rgba(5,150,105,0.3)' }}>
          {initials(b.name)}
        </div>
        <div style={{ flex: 1, paddingTop: 4 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: '#064E3B', lineHeight: 1.2, marginBottom: 5 }}>{b.name}</div>
          <div style={{ fontSize: 12, color: '#047857', marginBottom: 6 }}>📍 {b.location} &nbsp;·&nbsp; 🐾 {b.species}</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: '#D1FAE5', color: '#065F46', borderRadius: 999, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="#059669" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Đã xác minh
            </span>
          </div>
        </div>
      </div>

      {/* Commitment strip */}
      <div style={{ background: 'rgba(255,255,255,0.65)', borderRadius: 12, padding: '10px 14px', marginBottom: 16, backdropFilter: 'blur(4px)' }}>
        <div style={{ fontSize: 10, color: '#059669', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Cam kết</div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#065F46' }}>{b.score}</div>
            <div style={{ fontSize: 9, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Điểm tin cậy</div>
          </div>
          <div style={{ width: 1, background: '#A7F3D0' }} />
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#065F46' }}>{b.listings}</div>
            <div style={{ fontSize: 9, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tin đăng</div>
          </div>
          <div style={{ width: 1, background: '#A7F3D0' }} />
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#065F46' }}>0</div>
            <div style={{ fontSize: 9, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Báo cáo</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function HeroT5({ b }: { b: typeof SAMPLE_BREEDER }) {
  // Registered Kennel — dark navy, gold credentials accent, professional
  return (
    <div style={{ background: '#0F172A', position: 'relative', overflow: 'hidden' }}>
      {/* Subtle grid texture */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

      {/* Gold credentials banner */}
      <div style={{ background: 'linear-gradient(90deg, #B45309, #D97706, #F59E0B)', padding: '7px 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 14 }}>🏅</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>Trại đăng ký chính thức — VKA</span>
      </div>

      {/* Main identity */}
      <div style={{ display: 'flex', gap: 14, padding: '18px 20px 0', alignItems: 'center' }}>
        <div style={{ width: 62, height: 62, borderRadius: 18, background: 'linear-gradient(135deg, #1E3A5F, #1E6FE8)', border: '2px solid rgba(245,158,11,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 20, color: '#fff', flexShrink: 0 }}>
          {initials(b.name)}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: '#F8FAFC', lineHeight: 1.2, marginBottom: 5 }}>{b.name}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 5 }}>
            <span style={{ background: 'rgba(245,158,11,0.15)', color: '#FCD34D', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 999, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
              ✓ Đã xác minh
            </span>
            <span style={{ background: 'rgba(255,255,255,0.07)', color: '#94A3B8', borderRadius: 999, padding: '2px 8px', fontSize: 11 }}>
              {b.location}
            </span>
          </div>
          <div style={{ fontSize: 11, color: '#64748B' }}>🐾 {b.species} &nbsp;·&nbsp; {b.breeds}</div>
        </div>
      </div>

      {/* Metric strip dark */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, padding: '14px 20px 18px' }}>
        {[
          { label: 'Điểm tin cậy', value: `${b.score}/100`, accent: scoreColor(b.score) },
          { label: 'Tin đăng', value: `${b.listings} bài`, accent: '#F59E0B' },
          { label: 'Cấp độ', value: b.levelLabel, accent: '#1E6FE8' },
        ].map(m => (
          <div key={m.label} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '8px 10px', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ fontSize: 9, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{m.label}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: m.accent }}>{m.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Hero dispatcher ──────────────────────────────────────────────────────────

function BreederHero({ b, templateId }: { b: typeof SAMPLE_BREEDER; templateId: string }) {
  if (templateId === 'T2') return <HeroT2 b={b} />
  if (templateId === 'T3') return <HeroT3 b={b} />
  if (templateId === 'T4') return <HeroT4 b={b} />
  if (templateId === 'T5') return <HeroT5 b={b} />
  return <HeroT1 b={b} /> // default T1
}

// Action row — color adapts to template
function ActionRow({ templateId }: { templateId: string }) {
  const accent = templateId === 'T3' ? '#7C3AED' : templateId === 'T4' ? '#059669' : templateId === 'T5' ? '#D97706' : '#1E6FE8'
  return (
    <div style={{ padding: '14px 20px', display: 'flex', gap: 10, background: templateId === 'T5' ? '#0F172A' : '#fff', borderBottom: '1px solid #F1F5F9' }}>
      <button style={{ flex: 1, padding: '11px 0', background: accent, color: '#fff', fontWeight: 700, fontSize: 13, borderRadius: 12, border: 'none', cursor: 'pointer' }}>💬 Nhắn tin</button>
      <button style={{ flex: 1, padding: '11px 0', background: templateId === 'T5' ? 'rgba(255,255,255,0.08)' : '#fff', color: templateId === 'T5' ? '#E2E8F0' : '#0F172A', fontWeight: 600, fontSize: 13, borderRadius: 12, border: `1px solid ${templateId === 'T5' ? 'rgba(255,255,255,0.12)' : '#E2E8F0'}`, cursor: 'pointer' }}>📞 Liên hệ</button>
      <button style={{ width: 42, height: 42, background: '#FEF2F2', color: '#DC2626', fontWeight: 600, fontSize: 16, borderRadius: 12, border: '1px solid #FECACA', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⚑</button>
    </div>
  )
}

// ─── Screen: Top Breeders ─────────────────────────────────────────────────────

function TopBreedersScreen({ onSelect }: { onSelect: (id: string) => void }) {
  const [activeSpecies, setActiveSpecies] = useState('Tất cả')
  const [search, setSearch] = useState('')

  const filtered = BREEDERS.filter(b => {
    if (activeSpecies !== 'Tất cả' && b.species !== activeSpecies) return false
    if (search && !b.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div style={{ flex: 1, overflow: 'auto' }} className="scrollbar-hide">
      <div style={{ padding: '12px 16px 0' }}>
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px' }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="4.5" stroke="#94A3B8" strokeWidth="1.4"/><path d="M10.5 10.5l3 3" stroke="#94A3B8" strokeWidth="1.4" strokeLinecap="round"/></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm tên trại, giống, khu vực..." style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, color: '#0F172A', background: 'transparent' }} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, padding: '10px 16px', overflowX: 'auto' }} className="scrollbar-hide">
        {['Tất cả', 'Mèo', 'Chó'].map(chip => (
          <button key={chip} onClick={() => setActiveSpecies(chip)} style={{ flexShrink: 0, padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600, border: activeSpecies === chip ? 'none' : '1px solid #E2E8F0', background: activeSpecies === chip ? '#1E6FE8' : '#fff', color: activeSpecies === chip ? '#fff' : '#64748B', cursor: 'pointer' }}>
            {chip}
          </button>
        ))}
      </div>
      <DisclaimerBanner />
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 24 }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#94A3B8' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
            <div style={{ fontWeight: 600, color: '#64748B' }}>Không tìm thấy breeder</div>
          </div>
        ) : filtered.map(b => <TopBreederCard key={b.id} breeder={b} onTap={() => onSelect(b.id)} />)}
      </div>
    </div>
  )
}

function TopBreederCard({ breeder: b, onTap }: { breeder: typeof BREEDERS[0]; onTap: () => void }) {
  const [pressed, setPressed] = useState(false)
  return (
    <div onClick={onTap} onPointerDown={() => setPressed(true)} onPointerUp={() => setPressed(false)} onPointerLeave={() => setPressed(false)}
      style={{ background: '#fff', borderRadius: 20, border: '1px solid #E2E8F0', padding: '14px 14px 12px', cursor: 'pointer', transform: pressed ? 'scale(0.98)' : 'scale(1)', transition: 'transform 0.1s', boxShadow: pressed ? 'none' : '0 1px 4px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        {b.rank && b.rank <= 3 && (
          <div style={{ width: 22, height: 22, borderRadius: '50%', background: b.rank === 1 ? '#F59E0B' : b.rank === 2 ? '#94A3B8' : '#CD7C3C', color: '#fff', fontWeight: 800, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
            {b.rank}
          </div>
        )}
        <div style={{ width: 52, height: 52, borderRadius: 16, background: 'linear-gradient(135deg, #1E6FE8, #3B82F6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18, color: '#fff', flexShrink: 0 }}>
          {initials(b.name)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
            <VerifiedBadge />
            <span style={{ fontSize: 11, color: '#64748B' }}>{b.location} · {b.species}</span>
          </div>
          <TrustLevelChip level={b.level} label={b.levelLabel} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', marginTop: 12, padding: '10px 12px', background: '#F8FAFC', borderRadius: 12 }}>
        <MetricMini label="Điểm tin cậy" value={`${b.score}/100`} />
        <MetricMini label="Quy mô" value={b.scale} />
        <MetricMini label="Tin đăng" value={`${b.listings} bài`} />
        <MetricMini label="Loại hình" value={b.typeLabel} />
      </div>
      <button style={{ width: '100%', marginTop: 10, padding: '10px 0', background: '#EFF6FF', color: '#1E6FE8', fontWeight: 600, fontSize: 13, borderRadius: 12, border: 'none', cursor: 'pointer' }}>
        Xem hồ sơ trại →
      </button>
    </div>
  )
}

// ─── Screen: Breeder Detail ───────────────────────────────────────────────────

function BreederDetailScreen({ breederId, templateId }: { breederId: string; templateId: string }) {
  const b = BREEDERS.find(x => x.id === breederId) ?? SAMPLE_BREEDER
  const [activeTab, setActiveTab] = useState<'overview' | 'listings'>('overview')
  const [genderFilter, setGenderFilter] = useState('Tất cả')

  const isT5 = templateId === 'T5'
  const tabBg = isT5 ? '#0F172A' : '#fff'
  const tabText = isT5 ? '#94A3B8' : '#64748B'
  const tabActive = templateId === 'T3' ? '#7C3AED' : templateId === 'T4' ? '#059669' : templateId === 'T5' ? '#F59E0B' : '#1E6FE8'

  return (
    <div style={{ flex: 1, overflow: 'auto' }} className="scrollbar-hide">
      <BreederHero b={b} templateId={templateId} />
      <ActionRow templateId={templateId} />

      {/* Tabs */}
      <div style={{ display: 'flex', background: tabBg, borderBottom: `1px solid ${isT5 ? 'rgba(255,255,255,0.08)' : '#E2E8F0'}` }}>
        {['overview', 'listings'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab as any)} style={{ flex: 1, padding: '12px 0', background: 'none', border: 'none', borderBottom: activeTab === tab ? `2px solid ${tabActive}` : '2px solid transparent', color: activeTab === tab ? tabActive : tabText, fontWeight: activeTab === tab ? 700 : 500, fontSize: 13, cursor: 'pointer' }}>
            {tab === 'overview' ? 'Tổng quan' : `Tin đăng (${b.listings})`}
          </button>
        ))}
      </div>

      {activeTab === 'overview' ? (
        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 24 }}>
          <SectionCard title="Thông tin trại">
            <InfoRow icon="🏠" label="Loại hình" value={b.typeLabel} />
            <InfoRow icon="📍" label="Khu vực" value={b.location} />
            <InfoRow icon="🐾" label="Giống" value={b.breeds} />
            <InfoRow icon="📊" label="Quy mô" value={b.scale} />
          </SectionCard>
          <SectionCard title="Tín hiệu tin cậy">
            {SAMPLE_BREEDER.signals.map(s => (
              <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 8 }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: s.done ? '#D1FAE5' : '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 11 }}>
                  {s.done ? '✓' : '!'}
                </div>
                <div style={{ flex: 1, fontSize: 13, fontWeight: 500, color: '#0F172A' }}>{s.label}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: s.done ? '#059669' : '#D97706' }}>{s.earned}/{s.max}</div>
              </div>
            ))}
          </SectionCard>
          {b.bio && (
            <SectionCard title="Về trại">
              <p style={{ margin: 0, fontSize: 13, color: '#334155', lineHeight: 1.6 }}>{b.bio}</p>
            </SectionCard>
          )}
          <DisclaimerBanner />
        </div>
      ) : (
        <div style={{ padding: '14px 16px', paddingBottom: 24 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            {['Tất cả', 'Đực', 'Cái'].map(g => (
              <button key={g} onClick={() => setGenderFilter(g)} style={{ padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600, border: genderFilter === g ? 'none' : '1px solid #E2E8F0', background: genderFilter === g ? tabActive : '#fff', color: genderFilter === g ? '#fff' : '#64748B', cursor: 'pointer' }}>
                {g}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {LISTINGS.filter(l => genderFilter === 'Tất cả' || l.gender === genderFilter).map(l => (
              <PostCard key={l.id} listing={l} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0' }}>
      <div style={{ padding: '12px 16px 8px', borderBottom: '1px solid #F1F5F9', fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{title}</div>
      <div style={{ padding: '10px 16px 12px' }}>{children}</div>
    </div>
  )
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 6 }}>
      <span style={{ fontSize: 14 }}>{icon}</span>
      <span style={{ fontSize: 12, color: '#94A3B8', width: 72, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, color: '#0F172A', fontWeight: 500 }}>{value}</span>
    </div>
  )
}

function PostCard({ listing: l }: { listing: typeof LISTINGS[0] }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', display: 'flex', gap: 12, padding: 12, alignItems: 'center' }}>
      <img src={l.img} alt={l.title} style={{ width: 60, height: 60, borderRadius: 10, objectFit: 'cover', flexShrink: 0, background: '#E2E8F0' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.title}</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <span style={{ background: '#F1F5F9', color: '#64748B', borderRadius: 6, padding: '2px 7px', fontSize: 11 }}>{l.gender}</span>
          <span style={{ background: '#F1F5F9', color: '#64748B', borderRadius: 6, padding: '2px 7px', fontSize: 11 }}>{l.age}</span>
        </div>
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#1E6FE8', flexShrink: 0 }}>{l.price}</div>
    </div>
  )
}

// ─── Screen: Farm Health ──────────────────────────────────────────────────────

function FarmHealthScreen() {
  const b = SAMPLE_BREEDER
  return (
    <div style={{ flex: 1, overflow: 'auto' }} className="scrollbar-hide">
      <div style={{ margin: '16px 16px 0', background: '#fff', borderRadius: 20, border: '1px solid #E2E8F0', padding: '20px 20px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Farm Health</div>
            <div style={{ fontSize: 13, color: '#64748B', maxWidth: 220 }}>Tín hiệu tham khảo về mức độ minh bạch hồ sơ.</div>
          </div>
          <TrustLevelChip level={b.level} label={b.levelLabel} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <ScoreRing score={b.score} size={80} color={scoreColor(b.score)} trackColor="#F1F5F9" textColor={scoreColor(b.score)} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>Sức khoẻ trại của bạn</div>
            <div style={{ fontSize: 12, color: '#64748B' }}>Hoàn thiện thêm để tăng điểm và hiện với nhiều sen hơn.</div>
          </div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '12px 16px 0' }}>
        {[
          { label: 'Điểm tin cậy', value: `${b.score}/100`, sub: 'Trust score', color: scoreColor(b.score) },
          { label: 'Cấp độ', value: b.levelLabel, sub: 'Trust level', color: '#1E6FE8' },
          { label: 'Báo cáo', value: '0', sub: 'Chưa có báo cáo', color: '#059669' },
          { label: 'Tin đăng', value: `${b.listings}`, sub: 'Active listings', color: '#7C3AED' },
        ].map(t => (
          <div key={t.label} style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', padding: '14px 14px 12px' }}>
            <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{t.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: t.color, marginBottom: 2 }}>{t.value}</div>
            <div style={{ fontSize: 11, color: '#94A3B8' }}>{t.sub}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '10px 16px 0' }}>
        {['Giao dịch thành công', 'Giao dịch thất bại'].map(t => (
          <div key={t} style={{ background: '#F8FAFC', borderRadius: 16, border: '1px dashed #CBD5E1', padding: '14px 14px 12px', opacity: 0.7 }}>
            <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{t}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#CBD5E1', marginBottom: 4 }}>—</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#CBD5E1' }} />
              <div style={{ fontSize: 10, color: '#94A3B8' }}>Sắp có</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ margin: '12px 16px 0', background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0' }}>
        <div style={{ padding: '12px 16px 8px', borderBottom: '1px solid #F1F5F9', fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Chi tiết tín hiệu</div>
        <div style={{ padding: '10px 16px 4px' }}>
          {b.signals.map(s => (
            <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 10 }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: s.done ? '#D1FAE5' : '#FFF7ED', border: `1.5px solid ${s.done ? '#6EE7B7' : '#FCD34D'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 11 }}>
                {s.done ? '✓' : '·'}
              </div>
              <div style={{ flex: 1, fontSize: 13, fontWeight: 500, color: '#0F172A' }}>{s.label}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: s.done ? '#059669' : '#D97706' }}>{s.earned}/{s.max}đ</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ margin: '12px 16px 0', background: '#EFF6FF', borderRadius: 16, border: '1px solid #BFDBFE', padding: '14px 16px' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1E40AF', marginBottom: 10 }}>💡 Cải thiện điểm</div>
        {['Hoàn thiện checklist chăm sóc (+15)', 'Thêm ảnh môi trường nuôi', 'Đăng thêm tin đang bán'].map(tip => (
          <div key={tip} style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 8 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#1E6FE8', flexShrink: 0 }} />
            <div style={{ fontSize: 13, color: '#1E40AF' }}>{tip}</div>
          </div>
        ))}
      </div>
      <div style={{ margin: '10px 16px 24px', padding: '10px 14px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12 }}>
        <p style={{ margin: 0, fontSize: 11, color: '#92400E', lineHeight: 1.5 }}>Điểm tin cậy là chỉ số tham khảo, không phải điểm tín dụng hay bảo đảm giao dịch.</p>
      </div>
    </div>
  )
}

// ─── Screen: Template Picker ──────────────────────────────────────────────────

function TemplatePickerScreen({ selected, onSelect }: { selected: string; onSelect: (id: string) => void }) {
  const [pendingId, setPendingId] = useState(selected)
  const [showConfirm, setShowConfirm] = useState(false)
  const [applied, setApplied] = useState(false)

  const handleApply = () => {
    onSelect(pendingId)
    setShowConfirm(false)
    setApplied(true)
    setTimeout(() => setApplied(false), 2500)
  }

  return (
    <div style={{ flex: 1, overflow: 'auto', position: 'relative' }} className="scrollbar-hide">
      <div style={{ padding: '12px 16px 4px' }}>
        <p style={{ margin: 0, fontSize: 13, color: '#64748B' }}>Chọn giao diện trang trại của bạn. Nội dung hồ sơ không thay đổi khi đổi template.</p>
      </div>
      <div style={{ padding: '12px 16px 100px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {TEMPLATES.map(t => (
          <TemplatePreviewCard key={t.id} template={t} selected={pendingId === t.id} isApplied={selected === t.id} onSelect={() => setPendingId(t.id)} />
        ))}
      </div>

      <div style={{ position: 'sticky', bottom: 0, background: '#fff', borderTop: '1px solid #E2E8F0', padding: '12px 16px 20px' }}>
        <button onClick={() => setShowConfirm(true)} style={{ width: '100%', padding: '14px 0', background: '#1E6FE8', color: '#fff', fontWeight: 700, fontSize: 15, borderRadius: 14, border: 'none', cursor: 'pointer' }}>
          Áp dụng — {TEMPLATES.find(t => t.id === pendingId)?.name}
        </button>
      </div>

      {showConfirm && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.4)', display: 'flex', alignItems: 'flex-end' }} onClick={() => setShowConfirm(false)}>
          <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', padding: '24px 20px 32px', width: '100%' }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 36, height: 4, background: '#E2E8F0', borderRadius: 999, margin: '0 auto 20px' }} />
            <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>Áp dụng {TEMPLATES.find(t => t.id === pendingId)?.name}?</div>
            <p style={{ fontSize: 13, color: '#64748B', marginBottom: 20 }}>Có thể đổi lại sau trong cài đặt trang trại. Nội dung hồ sơ (tên, bio…) giữ nguyên.</p>
            <button onClick={handleApply} style={{ width: '100%', padding: '13px 0', background: '#1E6FE8', color: '#fff', fontWeight: 700, fontSize: 14, borderRadius: 12, border: 'none', cursor: 'pointer', marginBottom: 10 }}>Xác nhận áp dụng</button>
            <button onClick={() => setShowConfirm(false)} style={{ width: '100%', padding: '13px 0', background: '#F1F5F9', color: '#64748B', fontWeight: 600, fontSize: 14, borderRadius: 12, border: 'none', cursor: 'pointer' }}>Huỷ</button>
          </div>
        </div>
      )}

      {applied && (
        <div style={{ position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)', background: '#0F172A', color: '#fff', borderRadius: 999, padding: '10px 20px', fontSize: 13, fontWeight: 600, zIndex: 999, whiteSpace: 'nowrap', boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}>
          ✅ Đã áp dụng! Xem ở tab Hồ sơ trại.
        </div>
      )}
    </div>
  )
}

function TemplatePreviewCard({ template: t, selected, isApplied, onSelect }: { template: typeof TEMPLATES[0]; selected: boolean; isApplied: boolean; onSelect: () => void }) {
  // Mini hero preview per template
  const previews: Record<string, React.ReactNode> = {
    T1: (
      <div style={{ height: 72, background: `linear-gradient(145deg, #1A5FCC, #2563EB)`, borderRadius: '10px 10px 0 0', display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -10, top: -10, width: 60, height: 60, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
        <div style={{ width: 30, height: 30, borderRadius: 9, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#fff' }}>MH</div>
        <div style={{ flex: 1 }}>
          <div style={{ width: 70, height: 5, background: 'rgba(255,255,255,0.7)', borderRadius: 3, marginBottom: 4 }} />
          <div style={{ width: 50, height: 4, background: 'rgba(255,255,255,0.35)', borderRadius: 3 }} />
        </div>
        <div style={{ width: 36, height: 36, borderRadius: '50%', border: '2.5px solid rgba(255,255,255,0.5)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: '#fff', lineHeight: 1 }}>78</span>
          <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.6)' }}>/100</span>
        </div>
      </div>
    ),
    T2: (
      <div style={{ height: 72, borderRadius: '10px 10px 0 0', position: 'relative', overflow: 'hidden' }}>
        <img src="https://images.unsplash.com/photo-1517331156700-3c241d2b4d83?w=400&h=144&fit=crop&auto=format" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 20%, rgba(0,0,0,0.65))' }} />
        <div style={{ position: 'absolute', bottom: 8, left: 10, display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{ width: 24, height: 24, borderRadius: 7, border: '2px solid rgba(255,255,255,0.8)', background: 'linear-gradient(135deg,#1E6FE8,#3B82F6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 800, color: '#fff' }}>MH</div>
          <div style={{ width: 55, height: 4, background: 'rgba(255,255,255,0.85)', borderRadius: 2 }} />
        </div>
      </div>
    ),
    T3: (
      <div style={{ height: 72, borderRadius: '10px 10px 0 0', background: '#fff', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', padding: '0 12px', gap: 8, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #7C3AED, #A78BFA)' }} />
        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#7C3AED,#A78BFA)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: '#fff' }}>MH</div>
        <div style={{ flex: 1 }}>
          <div style={{ width: 65, height: 5, background: '#0F172A', borderRadius: 3, marginBottom: 4, opacity: 0.8 }} />
          <div style={{ width: 45, height: 3, background: '#E2E8F0', borderRadius: 2 }} />
        </div>
        <div style={{ background: '#F5F3FF', borderRadius: 8, padding: '5px 8px', textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#7C3AED', lineHeight: 1 }}>78</div>
          <div style={{ fontSize: 7, color: '#A78BFA' }}>/100</div>
        </div>
      </div>
    ),
    T4: (
      <div style={{ height: 72, borderRadius: '10px 10px 0 0', background: 'linear-gradient(150deg, #ECFDF5, #A7F3D0)', display: 'flex', alignItems: 'center', padding: '0 12px', gap: 10, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -5, top: -5, fontSize: 40, opacity: 0.12 }}>🐾</div>
        <div style={{ background: '#059669', borderRadius: 999, padding: '3px 10px', fontSize: 9, color: '#fff', fontWeight: 700 }}>♡ Cứu hộ</div>
        <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid #fff', background: 'linear-gradient(135deg,#059669,#34D399)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: '#fff' }}>MH</div>
        <div style={{ flex: 1 }}>
          <div style={{ width: 55, height: 5, background: '#064E3B', borderRadius: 3, opacity: 0.7 }} />
        </div>
      </div>
    ),
    T5: (
      <div style={{ height: 72, borderRadius: '10px 10px 0 0', background: '#0F172A', position: 'relative', overflow: 'hidden' }}>
        <div style={{ height: 14, background: 'linear-gradient(90deg,#B45309,#F59E0B)', display: 'flex', alignItems: 'center', padding: '0 10px', gap: 4 }}>
          <span style={{ fontSize: 7, color: '#fff', fontWeight: 700 }}>🏅 Trại đăng ký chính thức</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px' }}>
          <div style={{ width: 26, height: 26, borderRadius: 8, border: '1.5px solid rgba(245,158,11,0.5)', background: 'rgba(30,111,232,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 800, color: '#fff' }}>MH</div>
          <div>
            <div style={{ width: 60, height: 4, background: 'rgba(255,255,255,0.7)', borderRadius: 2, marginBottom: 4 }} />
            <div style={{ width: 40, height: 3, background: 'rgba(245,158,11,0.5)', borderRadius: 2 }} />
          </div>
        </div>
      </div>
    ),
  }

  return (
    <div onClick={onSelect} style={{ background: '#fff', borderRadius: 18, border: selected ? `2px solid #1E6FE8` : '1px solid #E2E8F0', cursor: 'pointer', overflow: 'hidden', boxShadow: selected ? '0 0 0 4px rgba(30,111,232,0.1)' : 'none', transition: 'all 0.15s' }}>
      {previews[t.id]}
      <div style={{ padding: '12px 14px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{t.name}</span>
            {isApplied && <span style={{ background: '#D1FAE5', color: '#065F46', borderRadius: 999, padding: '1px 7px', fontSize: 10, fontWeight: 700 }}>Đang dùng</span>}
          </div>
          {selected && (
            <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#1E6FE8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 5l2 2 4-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
            </div>
          )}
        </div>
        <div style={{ fontSize: 12, color: '#64748B', marginBottom: 8 }}>{t.desc}</div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#F1F5F9', borderRadius: 8, padding: '3px 8px' }}>
          <span style={{ fontSize: 10, color: '#94A3B8' }}>Phù hợp:</span>
          <span style={{ fontSize: 10, color: '#475569', fontWeight: 600 }}>{t.fit}</span>
        </div>
      </div>
    </div>
  )
}

// ─── Nav & App ────────────────────────────────────────────────────────────────

type NavTab = 'breeders' | 'detail' | 'farmhealth' | 'template'

const NAV_ITEMS: { id: NavTab; label: string; icon: string }[] = [
  { id: 'breeders', label: 'Breeders', icon: '🏪' },
  { id: 'detail', label: 'Hồ sơ trại', icon: '📋' },
  { id: 'farmhealth', label: 'Sức khoẻ', icon: '📊' },
  { id: 'template', label: 'Template', icon: '🎨' },
]

export default function App() {
  const [screen, setScreen] = useState<NavTab>('breeders')
  const [selectedBreeder, setSelectedBreeder] = useState('1')
  const [selectedTemplate, setSelectedTemplate] = useState('T1')

  const handleSelectBreeder = (id: string) => {
    setSelectedBreeder(id)
    setScreen('detail')
  }

  const isDetailDark = selectedTemplate === 'T5'

  const headerTitles: Record<NavTab, string> = {
    breeders: 'Top Breeders',
    detail: 'Hồ sơ trại',
    farmhealth: 'Sức khoẻ trại',
    template: 'Chọn giao diện',
  }

  // Header bg adapts to template hero color
  const headerBg: Record<string, string> = {
    T1: '#1E6FE8', T2: 'transparent', T3: '#fff', T4: '#ECFDF5', T5: '#0F172A',
  }
  const headerTextColor: Record<string, string> = {
    T1: '#fff', T2: '#fff', T3: '#0F172A', T4: '#064E3B', T5: '#F8FAFC',
  }

  const hBg = screen === 'detail' ? headerBg[selectedTemplate] : '#F2F4F8'
  const hText = screen === 'detail' ? headerTextColor[selectedTemplate] : '#0F172A'

  return (
    <div style={{ background: '#dde2ea', minHeight: '100vh', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '32px 0' }}>
      <div style={{ width: 390, minHeight: 844, background: '#F2F4F8', borderRadius: 44, overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.2), 0 4px 16px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        {/* Status bar */}
        <div style={{ background: hBg, padding: '14px 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, transition: 'background 0.3s' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: hText, transition: 'color 0.3s' }}>9:41</span>
          <div style={{ width: 80, height: 14, background: hBg === '#F2F4F8' ? '#E2E8F0' : 'rgba(255,255,255,0.2)', borderRadius: 999 }} />
          <span style={{ fontSize: 12, color: hText, transition: 'color 0.3s' }}>100%</span>
        </div>

        {/* App header */}
        <div style={{ background: hBg, padding: '8px 20px 12px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, transition: 'background 0.3s' }}>
          {screen !== 'breeders' && (
            <button onClick={() => setScreen('breeders')} style={{ width: 32, height: 32, borderRadius: 10, background: screen === 'detail' && selectedTemplate !== 'T3' && selectedTemplate !== 'T4' ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 16 16"><path d="M10 12L6 8l4-4" stroke={hText} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
            </button>
          )}
          <span style={{ fontSize: 17, fontWeight: 800, color: hText, flex: 1, transition: 'color 0.3s' }}>{headerTitles[screen]}</span>
          {screen === 'breeders' && (
            <div style={{ background: '#1E6FE8', borderRadius: 10, padding: '5px 10px' }}>
              <span style={{ fontSize: 11, color: '#fff', fontWeight: 600 }}>Pet Feed</span>
            </div>
          )}
          {screen === 'template' && (
            <div style={{ background: '#EFF6FF', borderRadius: 10, padding: '5px 10px' }}>
              <span style={{ fontSize: 11, color: '#1E6FE8', fontWeight: 600 }}>Template: {selectedTemplate}</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0, background: isDetailDark && screen === 'detail' ? '#0F172A' : '#F2F4F8' }}>
          {screen === 'breeders' && <TopBreedersScreen onSelect={handleSelectBreeder} />}
          {screen === 'detail' && <BreederDetailScreen breederId={selectedBreeder} templateId={selectedTemplate} />}
          {screen === 'farmhealth' && <FarmHealthScreen />}
          {screen === 'template' && <TemplatePickerScreen selected={selectedTemplate} onSelect={setSelectedTemplate} />}
        </div>

        {/* Bottom nav */}
        <div style={{ background: isDetailDark && screen === 'detail' ? '#0F172A' : '#fff', borderTop: `1px solid ${isDetailDark && screen === 'detail' ? 'rgba(255,255,255,0.08)' : '#E2E8F0'}`, padding: '10px 0 20px', display: 'flex', flexShrink: 0 }}>
          {NAV_ITEMS.map(item => (
            <button key={item.id} onClick={() => setScreen(item.id)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' }}>
              <span style={{ fontSize: 20, lineHeight: 1 }}>{item.icon}</span>
              <span style={{ fontSize: 9.5, fontWeight: screen === item.id ? 700 : 500, color: screen === item.id ? '#1E6FE8' : (isDetailDark && screen === 'detail' ? '#475569' : '#94A3B8') }}>{item.label}</span>
              {screen === item.id && <div style={{ width: 16, height: 3, background: '#1E6FE8', borderRadius: 999 }} />}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
