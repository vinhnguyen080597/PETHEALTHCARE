import { useState } from 'react'
import type { Lang, View } from '../data'

// ─── VerifiedBadge ────────────────────────────────────────────────────────────

export function VerifiedBadge({ size = 'sm' }: { size?: 'sm' | 'xs' }) {
  const cls = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-[10px] px-1.5 py-0.5'
  return (
    <span className={`inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 rounded-full font-medium border border-emerald-200 ${cls}`}>
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <circle cx="5" cy="5" r="5" fill="#059669" />
        <path d="M3 5l1.5 1.5L7 3.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Verified
    </span>
  )
}

// ─── PendingBadge ─────────────────────────────────────────────────────────────

export function PendingBadge() {
  return (
    <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-xs px-2 py-0.5 rounded-full font-medium border border-amber-200">
      <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
      Chờ duyệt
    </span>
  )
}

// ─── TrustLevelChip ───────────────────────────────────────────────────────────

export function TrustLevelChip({ level, label }: { level: 'L0' | 'L1' | 'L2' | 'L3'; label: string }) {
  const colorMap = {
    L0: 'bg-slate-100 text-slate-500 border-slate-200',
    L1: 'bg-blue-50 text-blue-600 border-blue-200',
    L2: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    L3: 'bg-amber-50 text-amber-700 border-amber-200',
  }
  return (
    <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full border ${colorMap[level]}`}>
      {level} · {label}
    </span>
  )
}

// ─── DisclaimerBanner ─────────────────────────────────────────────────────────

export function DisclaimerBanner({ lang }: { lang: Lang }) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-900 leading-relaxed">
      <span className="font-semibold mr-1">⚠</span>
      {lang === 'VI'
        ? 'Tin đăng do người dùng đăng. Pet Health Care không phải bên bán, không xử lý thanh toán và không bảo lãnh sức khỏe thú, thông tin hay giao dịch. Hãy kiểm tra trực tiếp và đọc '
        : 'Listings are posted by users. Pet Health Care is not the seller, does not process payments, and does not guarantee pets, health claims, or transactions. Verify in person and read our '}
      <button className="underline font-medium hover:text-amber-800 transition-colors">
        {lang === 'VI' ? 'Nội quy Marketplace' : 'Marketplace Guidelines'}
      </button>
      {lang === 'VI' ? ' trước khi quyết định.' : ' before deciding.'}
    </div>
  )
}

// ─── Header ───────────────────────────────────────────────────────────────────

export function Header({
  lang,
  setLang,
  view,
  setView,
  unreadCount = 3,
  isAdmin = false,
}: {
  lang: Lang
  setLang: (l: Lang) => void
  view: View
  setView: (v: View) => void
  unreadCount?: number
  isAdmin?: boolean
}) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-100 shadow-sm">
      <div className="max-w-[1200px] mx-auto px-5 lg:px-8 h-16 flex items-center gap-3">
        <button onClick={() => setView('landing')} className="flex items-center gap-2 flex-shrink-0">
          <div className="w-8 h-8 bg-[#1E6FE8] rounded-lg flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 2C5.13 2 2 5.13 2 9c0 3.87 3.13 7 7 7s7-3.13 7-7c0-3.87-3.13-7-7-7Z" fill="white" opacity=".25" />
              <circle cx="6.5" cy="8" r="1.5" fill="white" />
              <circle cx="11.5" cy="8" r="1.5" fill="white" />
              <path d="M7 11.5c.5.5 1 .75 2 .75s1.5-.25 2-.75" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </div>
          <div className="hidden sm:block">
            <span className="font-bold text-slate-900 text-sm">Pet Marketplace</span>
            {isAdmin && <span className="ml-1.5 text-[10px] font-semibold text-[#1E6FE8] bg-blue-50 px-1.5 py-0.5 rounded">Admin</span>}
          </div>
        </button>

        <nav className="hidden md:flex items-center gap-1 flex-1">
          {!isAdmin && (
            <>
              <button onClick={() => setView('feed')} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${view === 'feed' || view === 'detail' ? 'bg-blue-50 text-[#1E6FE8]' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
                {lang === 'VI' ? 'Duyệt tin' : 'Browse'}
              </button>
              <button onClick={() => setView('farm-detail')} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${view === 'farm-detail' ? 'bg-blue-50 text-[#1E6FE8]' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
                Breeders
              </button>
            </>
          )}
        </nav>

        <div className="hidden lg:flex flex-1 max-w-xs">
          <div className="w-full relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="6" cy="6" r="4" /><path d="m9.5 9.5 2.5 2.5" strokeLinecap="round" />
            </svg>
            <input type="text" placeholder={lang === 'VI' ? 'Tìm kiếm…' : 'Search…'} className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E6FE8]/20 focus:border-[#1E6FE8] transition-all" />
          </div>
        </div>

        <div className="flex items-center gap-1 ml-auto md:ml-0">
          <button className="relative w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M15.5 11.5c0 .83-.67 1.5-1.5 1.5H5.5L2.5 15.5v-12C2.5 2.67 3.17 2 4 2h10c.83 0 1.5.67 1.5 1.5v8Z" />
            </svg>
            {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-[#EF4444] text-white text-[9px] font-bold rounded-full flex items-center justify-center">{unreadCount}</span>}
          </button>
          <button className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M9 2a5 5 0 0 0-5 5v3.5L2.5 12h13L14 10.5V7a5 5 0 0 0-5-5Z" />
              <path d="M7.5 14a1.5 1.5 0 0 0 3 0" strokeLinecap="round" />
            </svg>
          </button>
          <button onClick={() => setLang(lang === 'VI' ? 'EN' : 'VI')} className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors border border-slate-200">
            {lang === 'VI' ? 'EN' : 'VI'}
          </button>

          {!isAdmin ? (
            <button
              onClick={() => setView('admin')}
              className="hidden md:flex items-center gap-2 ml-1 px-3.5 py-1.5 bg-[#1E6FE8] text-white text-sm font-medium rounded-full hover:bg-[#1D4ED8] transition-colors"
              title="Admin demo"
            >
              {lang === 'VI' ? 'Đăng nhập' : 'Log in'}
            </button>
          ) : (
            <button onClick={() => setView('landing')} className="hidden md:flex items-center gap-2 ml-1 px-3.5 py-1.5 bg-slate-100 text-slate-700 text-sm font-medium rounded-full hover:bg-slate-200 transition-colors">
              ← {lang === 'VI' ? 'Về Marketplace' : 'Back'}
            </button>
          )}

          <button className="md:hidden w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-50" onClick={() => setMenuOpen(!menuOpen)}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M2 4.5h14M2 9h14M2 13.5h14" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white px-5 py-3 flex flex-col gap-1">
          <button onClick={() => { setView('feed'); setMenuOpen(false) }} className="text-left px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">{lang === 'VI' ? 'Duyệt tin' : 'Browse'}</button>
          <button onClick={() => { setView('farm-detail'); setMenuOpen(false) }} className="text-left px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">Breeders</button>
          <button onClick={() => { setView('admin'); setMenuOpen(false) }} className="text-left px-3 py-2 rounded-lg text-sm font-medium text-[#1E6FE8] hover:bg-blue-50">Admin Console</button>
        </div>
      )}
    </header>
  )
}

// ─── AppDownloadBanner ────────────────────────────────────────────────────────

export function AppDownloadBanner({ lang }: { lang: Lang }) {
  return (
    <div className="bg-gradient-to-r from-[#1E6FE8] to-[#2563EB] rounded-2xl p-6 lg:p-8 flex flex-col lg:flex-row items-center gap-6 text-white">
      <div className="flex-1">
        <p className="text-sm font-semibold text-blue-100 mb-1">Pet Health Care App</p>
        <h3 className="text-xl lg:text-2xl font-bold mb-2">
          {lang === 'VI' ? 'Cần theo dõi sức khỏe thú cưng?' : "Need to track your pet's health?"}
        </h3>
        <p className="text-sm text-blue-100 leading-relaxed max-w-md">
          {lang === 'VI'
            ? 'Tải app Pet Health Care — AI sàng lọc sơ bộ, nhắc vaccine, nhật ký sức khỏe đầy đủ.'
            : 'Download Pet Health Care — AI health screening, vaccine reminders, and complete health diary.'}
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        {['App Store', 'Google Play'].map((store) => (
          <button key={store} className="flex items-center gap-2.5 bg-black text-white px-5 py-3 rounded-xl hover:bg-gray-900 transition-colors">
            <div>
              <p className="text-[9px] opacity-70">Download on the</p>
              <p className="text-sm font-semibold">{store}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── ListingCard ──────────────────────────────────────────────────────────────

export function ListingCard({
  listing,
  lang,
  onSelect,
  onSaveToggle,
}: {
  listing: import('../data').Listing
  lang: Lang
  onSelect: (l: import('../data').Listing) => void
  onSaveToggle: (id: string) => void
}) {
  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-100 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group" onClick={() => onSelect(listing)}>
      <div className="relative overflow-hidden h-48 bg-slate-100">
        <img src={listing.mediaUrl} alt={listing.breed} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        <button className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-white transition-colors" onClick={(e) => { e.stopPropagation(); onSaveToggle(listing.id) }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill={listing.saved ? '#EF4444' : 'none'} stroke={listing.saved ? '#EF4444' : '#64748B'} strokeWidth="1.5">
            <path d="M8 13.5S1.5 9.5 1.5 5.5C1.5 3.57 3.07 2 5 2c1.09 0 2.07.5 2.75 1.28L8 3.58l.25-.3A3.5 3.5 0 0 1 11 2c1.93 0 3.5 1.57 3.5 3.5 0 4-6.5 8-6.5 8Z" />
          </svg>
        </button>
        <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-slate-600 text-xs font-medium px-2 py-0.5 rounded-full">
          {listing.species === 'cat' ? '🐱' : '🐶'} {listing.species === 'cat' ? 'Cat' : 'Dog'}
        </span>
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-slate-900 text-sm leading-tight mb-1 line-clamp-2">{lang === 'VI' ? listing.titleVI : listing.title}</h3>
        <p className="text-[#1E6FE8] font-bold text-base mb-2">{listing.price}</p>
        <div className="flex items-center gap-1 text-slate-500 text-xs mb-3">
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5.5 1a3 3 0 0 1 3 3C8.5 7 5.5 10 5.5 10S2.5 7 2.5 4a3 3 0 0 1 3-3Z" /><circle cx="5.5" cy="4" r=".8" /></svg>
          {listing.location} · {listing.ageMonths}{lang === 'VI' ? 't' : 'mo'} · {lang === 'VI' ? (listing.gender === 'male' ? 'Đực' : 'Cái') : listing.gender}
        </div>
        <div className="flex items-center gap-2">
          <img src={listing.breeder.avatar} alt={listing.breeder.name} className="w-5 h-5 rounded-full object-cover" />
          <span className="text-xs text-slate-500 truncate max-w-[100px]">{listing.breeder.name}</span>
          {listing.breeder.verified && <VerifiedBadge size="xs" />}
        </div>
      </div>
    </div>
  )
}
