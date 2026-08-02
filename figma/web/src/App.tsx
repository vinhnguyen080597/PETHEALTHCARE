import { useState } from 'react'
import type { Lang, View, Listing, BreederProfile, TemplateId } from './data'
import { sampleListings, sampleBreeders } from './data'
import { Header, DisclaimerBanner, ListingCard, AppDownloadBanner, VerifiedBadge, TrustLevelChip } from './components/Shared'
import { FarmDetail } from './views/FarmDetail'
import { TemplatePicker } from './views/TemplatePicker'
import { FarmHealth } from './views/FarmHealth'
import { AdminConsole } from './views/Admin'

// ─── Landing ──────────────────────────────────────────────────────────────────

function LandingView({
  lang, listings, setView, onSelectListing, onSaveToggle,
}: { lang: Lang; listings: Listing[]; setView: (v: View) => void; onSelectListing: (l: Listing) => void; onSaveToggle: (id: string) => void }) {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative bg-white overflow-hidden">
        <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'radial-gradient(circle at 70% 50%, #dbeafe 0%, transparent 60%), radial-gradient(circle at 20% 80%, #ede9fe 0%, transparent 50%)' }} />
        <div className="relative max-w-[1200px] mx-auto px-5 lg:px-8 pt-16 pb-20 lg:pt-24 lg:pb-28 flex flex-col lg:flex-row items-center gap-12">
          <div className="flex-1 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 bg-blue-50 text-[#1E6FE8] text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
              <span className="w-1.5 h-1.5 bg-[#1E6FE8] rounded-full animate-pulse" />
              {lang === 'VI' ? 'Nền tảng tin thú cưng có cấu trúc' : 'Structured Pet Marketplace'}
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 leading-tight mb-5">
              {lang === 'VI' ? (<>Tìm tin thú cưng<br /><span className="text-[#1E6FE8]">có cấu trúc</span><br />từ breeder uy tín</>) : (<>Find structured<br /><span className="text-[#1E6FE8]">pet listings</span><br />from verified breeders</>)}
            </h1>
            <p className="text-slate-500 text-lg mb-8 max-w-md mx-auto lg:mx-0 leading-relaxed">
              {lang === 'VI' ? 'Không còn tin rải rác trên FB. Thông tin rõ ràng, breeder xác minh, liên hệ trong app.' : 'No more scattered FB posts. Clear info, verified breeders, in-app messaging.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-2 max-w-lg mx-auto lg:mx-0">
              <div className="flex-1 relative">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="7" cy="7" r="4.5" /><path d="m11 11 2.5 2.5" strokeLinecap="round" /></svg>
                <input type="text" placeholder={lang === 'VI' ? 'Tìm giống, khu vực…' : 'Search breed, location…'} className="w-full pl-10 pr-4 py-3.5 bg-white border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#1E6FE8]/30 focus:border-[#1E6FE8] shadow-sm transition-all" />
              </div>
              <button onClick={() => setView('feed')} className="px-6 py-3.5 bg-[#1E6FE8] text-white text-sm font-semibold rounded-full hover:bg-[#1D4ED8] transition-colors shadow-md shadow-blue-200 whitespace-nowrap">
                {lang === 'VI' ? 'Tìm kiếm' : 'Search'}
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mt-4 justify-center lg:justify-start">
              {['🐱 Mèo / Cat', '🐶 Chó / Dog', '🦜 Chim / Bird'].map(tag => (
                <button key={tag} onClick={() => setView('feed')} className="px-3 py-1.5 bg-slate-100 hover:bg-blue-50 hover:text-[#1E6FE8] text-slate-600 text-xs font-medium rounded-full transition-colors">{tag}</button>
              ))}
            </div>
          </div>
          <div className="flex-1 relative w-full max-w-md lg:max-w-none">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-3">
                <div className="rounded-2xl overflow-hidden h-48 bg-slate-100"><img src="https://images.unsplash.com/photo-1533743983669-94fa5c4338ec?w=400&h=400&fit=crop&auto=format" alt="British Shorthair" className="w-full h-full object-cover" /></div>
                <div className="rounded-2xl overflow-hidden h-32 bg-slate-100"><img src="https://images.unsplash.com/photo-1601979031925-424e53b6caaa?w=400&h=300&fit=crop&auto=format" alt="Golden Retriever" className="w-full h-full object-cover" /></div>
              </div>
              <div className="space-y-3 mt-6">
                <div className="rounded-2xl overflow-hidden h-32 bg-slate-100"><img src="https://images.unsplash.com/photo-1574158622682-e40e69881006?w=400&h=300&fit=crop&auto=format" alt="Scottish Fold" className="w-full h-full object-cover" /></div>
                <div className="rounded-2xl overflow-hidden h-48 bg-slate-100"><img src="https://images.unsplash.com/photo-1558788353-f76d92427f16?w=400&h=400&fit=crop&auto=format" alt="Corgi" className="w-full h-full object-cover" /></div>
              </div>
            </div>
            <div className="absolute -bottom-4 -left-4 bg-white rounded-xl shadow-lg p-3 flex items-center gap-3 border border-slate-100">
              <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="8" fill="#059669" opacity=".15" /><path d="M5 9l3 3 5-5" stroke="#059669" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-900">156 {lang === 'VI' ? 'breeder xác minh' : 'verified breeders'}</p>
                <p className="text-[10px] text-slate-400">{lang === 'VI' ? 'Trên toàn quốc' : 'Nationwide'}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value props */}
      <section className="max-w-[1200px] mx-auto px-5 lg:px-8 py-16">
        <h2 className="text-2xl font-bold text-slate-900 text-center mb-3">{lang === 'VI' ? 'Tại sao chọn Pet Marketplace?' : 'Why Pet Marketplace?'}</h2>
        <p className="text-slate-500 text-center mb-10 text-sm">{lang === 'VI' ? 'Hơn hẳn tin FB rải rác' : 'A step above scattered social posts'}</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: '📋', en: { title: 'Structured listings', desc: 'Breed, age, vaccines, price, region — all in one place.' }, vi: { title: 'Tin có cấu trúc', desc: 'Giống, tuổi, vaccine, giá, khu vực — rõ ràng, không chôn trong comment.' } },
            { icon: '✅', en: { title: 'Verified breeders', desc: 'Admin-reviewed profiles with trust signals and history.' }, vi: { title: 'Breeder đã xác minh', desc: 'Hồ sơ được admin duyệt, có trust signals và lịch sử đăng tin.' } },
            { icon: '💬', en: { title: 'In-app contact', desc: 'DM directly within the platform with clear disclaimer.' }, vi: { title: 'Liên hệ trong app', desc: 'Nhắn tin trực tiếp trong nền tảng. Disclaimer marketplace rõ ràng.' } },
          ].map(item => (
            <div key={item.en.title} className="bg-white rounded-xl p-6 border border-slate-100 hover:border-blue-100 hover:shadow-sm transition-all">
              <div className="text-3xl mb-4">{item.icon}</div>
              <h3 className="font-semibold text-slate-900 mb-2">{lang === 'VI' ? item.vi.title : item.en.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{lang === 'VI' ? item.vi.desc : item.en.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured listings */}
      <section className="max-w-[1200px] mx-auto px-5 lg:px-8 pb-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">{lang === 'VI' ? 'Tin mới nhất' : 'Latest listings'}</h2>
          <button onClick={() => setView('feed')} className="text-sm text-[#1E6FE8] font-medium hover:text-[#1D4ED8] transition-colors">{lang === 'VI' ? 'Xem tất cả →' : 'View all →'}</button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.slice(0, 3).map(l => <ListingCard key={l.id} listing={l} lang={lang} onSelect={onSelectListing} onSaveToggle={onSaveToggle} />)}
        </div>
      </section>

      {/* Top Breeders teaser */}
      <section className="max-w-[1200px] mx-auto px-5 lg:px-8 pb-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">{lang === 'VI' ? 'Breeder nổi bật' : 'Featured Breeders'}</h2>
          <button onClick={() => setView('farm-detail')} className="text-sm text-[#1E6FE8] font-medium hover:text-[#1D4ED8] transition-colors">{lang === 'VI' ? 'Xem tất cả →' : 'View all →'}</button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {sampleBreeders.map(b => (
            <button key={b.id} onClick={() => setView('farm-detail')} className="bg-white rounded-xl border border-slate-100 p-4 text-left hover:shadow-sm hover:border-blue-100 transition-all">
              <div className="flex items-center gap-3 mb-3">
                <img src={b.avatar} alt={b.name} className="w-10 h-10 rounded-full object-cover" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{b.name}</p>
                  <p className="text-xs text-slate-400 truncate">{b.location}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {b.verified && <VerifiedBadge size="xs" />}
                <span className="text-xs text-slate-400">{b.trustScore}/100</span>
                <span className="text-xs text-slate-400">· {b.activeListings} tin</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* App download */}
      <section className="max-w-[1200px] mx-auto px-5 lg:px-8 pb-16"><AppDownloadBanner lang={lang} /></section>

      {/* Stats */}
      <section className="bg-white border-y border-slate-100">
        <div className="max-w-[1200px] mx-auto px-5 lg:px-8 py-10 grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
          {[{ num: '2,400+', en: 'Active listings', vi: 'Tin đang đăng' }, { num: '156+', en: 'Verified breeders', vi: 'Breeder xác minh' }, { num: '63', en: 'Provinces', vi: 'Tỉnh thành' }, { num: '12K+', en: 'Happy pet owners', vi: 'Sen đã dùng' }].map(s => (
            <div key={s.num}>
              <p className="text-3xl font-bold text-[#1E6FE8] mb-1">{s.num}</p>
              <p className="text-sm text-slate-500">{lang === 'VI' ? s.vi : s.en}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white">
        <div className="max-w-[1200px] mx-auto px-5 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 bg-[#1E6FE8] rounded-lg flex items-center justify-center"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="5" cy="6" r="1.2" fill="white" /><circle cx="9" cy="6" r="1.2" fill="white" /><path d="M5 9c.5.5 1 .8 2 .8s1.5-.3 2-.8" stroke="white" strokeWidth="1" strokeLinecap="round" /></svg></div>
                <span className="font-bold text-sm">Pet Marketplace</span>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed max-w-xs">{lang === 'VI' ? 'Marketplace thú cưng có cấu trúc — tìm tin breeder, so sánh thông tin, liên hệ an toàn.' : 'Structured pet marketplace — find breeder listings, compare info, contact safely.'}</p>
            </div>
            <div>
              <p className="font-semibold text-sm mb-3 text-slate-300">Marketplace</p>
              <div className="space-y-2">{[{ en: 'Browse listings', vi: 'Duyệt tin' }, { en: 'Breeders', vi: 'Breeder' }, { en: 'Create listing', vi: 'Đăng tin' }].map(item => <p key={item.en} className="text-slate-400 text-sm hover:text-white cursor-pointer transition-colors">{lang === 'VI' ? item.vi : item.en}</p>)}</div>
            </div>
            <div>
              <p className="font-semibold text-sm mb-3 text-slate-300">{lang === 'VI' ? 'Pháp lý' : 'Legal'}</p>
              <div className="space-y-2">{['Privacy Policy', 'Terms of Service', 'Marketplace Guidelines', 'Support'].map(item => <p key={item} className="text-slate-400 text-sm hover:text-white cursor-pointer transition-colors">{item}</p>)}</div>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <p>© 2026 Pet Marketplace · pet-marketplace.org</p>
            <p>{lang === 'VI' ? 'Tin đăng do người dùng đăng. Pet Health Care không xử lý thanh toán.' : 'Listings posted by users. Pet Health Care does not process payments.'}</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

// ─── Feed ─────────────────────────────────────────────────────────────────────

function FeedView({ lang, listings, onSelectListing, onSaveToggle }: { lang: Lang; listings: Listing[]; onSelectListing: (l: Listing) => void; onSaveToggle: (id: string) => void }) {
  const [activeTab, setActiveTab] = useState<'pets' | 'news' | 'breeders'>('pets')
  const [activeSpecies, setActiveSpecies] = useState('all')
  const [activeGender, setActiveGender] = useState('all')
  const [sortBy, setSortBy] = useState('date')

  const filtered = listings.filter(l => {
    if (activeSpecies !== 'all' && l.species !== activeSpecies) return false
    if (activeGender !== 'all' && l.gender !== activeGender) return false
    return true
  })

  return (
    <div className="max-w-[1200px] mx-auto px-5 lg:px-8 py-6">
      <div className="mb-5"><DisclaimerBanner lang={lang} /></div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1 relative">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="6.5" cy="6.5" r="4.5" /><path d="m10.5 10.5 3 3" strokeLinecap="round" /></svg>
          <input type="text" placeholder={lang === 'VI' ? 'Tìm giống, breeder, khu vực…' : 'Search breed, breeder, location…'} className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E6FE8]/20 focus:border-[#1E6FE8] transition-all" />
        </div>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1E6FE8]/20">
          <option value="date">{lang === 'VI' ? 'Mới nhất' : 'Newest'}</option>
          <option value="price">{lang === 'VI' ? 'Theo giá' : 'By price'}</option>
          <option value="age">{lang === 'VI' ? 'Theo tuổi' : 'By age'}</option>
        </select>
      </div>
      <div className="flex flex-wrap gap-2 mb-5">
        <span className="text-xs text-slate-400 font-medium py-1.5 mr-1">{lang === 'VI' ? 'Lọc:' : 'Filter:'}</span>
        {[{ key: 'all', en: 'All', vi: 'Tất cả' }, { key: 'cat', en: '🐱 Cat', vi: '🐱 Mèo' }, { key: 'dog', en: '🐶 Dog', vi: '🐶 Chó' }, { key: 'bird', en: '🦜 Bird', vi: '🦜 Chim' }].map(f => (
          <button key={f.key} onClick={() => setActiveSpecies(f.key)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${activeSpecies === f.key ? 'bg-[#1E6FE8] text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-[#1E6FE8] hover:text-[#1E6FE8]'}`}>
            {lang === 'VI' ? f.vi : f.en}
          </button>
        ))}
        {[{ key: 'all', en: 'All', vi: 'Tất cả' }, { key: 'male', en: 'Male', vi: 'Đực' }, { key: 'female', en: 'Female', vi: 'Cái' }].map(g => (
          <button key={g.key} onClick={() => setActiveGender(g.key)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${activeGender === g.key ? 'bg-[#1E6FE8] text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-[#1E6FE8] hover:text-[#1E6FE8]'}`}>
            {lang === 'VI' ? g.vi : g.en}
          </button>
        ))}
      </div>
      <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 mb-6 w-fit">
        {([['pets', 'Tin mới', 'New Pets'], ['news', 'Tin tức', 'News'], ['breeders', 'Breeder', 'Breeders']] as const).map(([key, vi, en]) => (
          <button key={key} onClick={() => setActiveTab(key)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === key ? 'bg-[#1E6FE8] text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>
            {lang === 'VI' ? vi : en}
          </button>
        ))}
      </div>
      {activeTab === 'pets' && (
        <>
          <p className="text-xs text-slate-400 mb-4">{filtered.length} {lang === 'VI' ? 'kết quả' : 'results'}</p>
          {filtered.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {filtered.map(l => <ListingCard key={l.id} listing={l} lang={lang} onSelect={onSelectListing} onSaveToggle={onSaveToggle} />)}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-4xl mb-4">🐾</p>
              <p className="font-semibold text-slate-700">{lang === 'VI' ? 'Không có kết quả' : 'No listings found'}</p>
            </div>
          )}
          <div className="text-center"><button className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-full hover:border-[#1E6FE8] hover:text-[#1E6FE8] transition-all">{lang === 'VI' ? 'Tải thêm' : 'Load more'}</button></div>
        </>
      )}
      {activeTab === 'news' && (
        <div className="space-y-4">
          {[{ title: lang === 'VI' ? 'Cách chọn thức ăn cho mèo con đúng cách' : 'How to choose the right food for your kitten', date: '24/07/2026', img: 'https://images.unsplash.com/photo-1533743983669-94fa5c4338ec?w=400&h=200&fit=crop&auto=format' }, { title: lang === 'VI' ? 'Tải app Pet Health Care để theo dõi sức khỏe thú cưng' : 'Download Pet Health Care to track your pet\'s health', date: '10/07/2026', img: 'https://images.unsplash.com/photo-1601979031925-424e53b6caaa?w=400&h=200&fit=crop&auto=format' }].map(n => (
            <div key={n.title} className="bg-white rounded-xl border border-slate-100 overflow-hidden flex hover:shadow-sm transition-all cursor-pointer">
              <div className="w-32 h-24 flex-shrink-0 bg-slate-100"><img src={n.img} alt="" className="w-full h-full object-cover" /></div>
              <div className="p-4 flex flex-col justify-center">
                <p className="font-semibold text-slate-900 text-sm mb-1">{n.title}</p>
                <p className="text-xs text-slate-400">{n.date}</p>
              </div>
            </div>
          ))}
        </div>
      )}
      {activeTab === 'breeders' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sampleBreeders.map(b => (
            <div key={b.id} className="bg-white rounded-xl p-5 border border-slate-100 hover:shadow-sm hover:border-blue-100 transition-all cursor-pointer">
              <div className="flex items-start gap-3 mb-3">
                <img src={b.avatar} alt={b.name} className="w-12 h-12 rounded-full object-cover" />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-slate-900 text-sm">{b.name}</h3>
                    {b.verified && <VerifiedBadge size="xs" />}
                  </div>
                  <p className="text-xs text-slate-400">{b.location}</p>
                  <div className="mt-1">
                    <TrustLevelChip level={b.trustScore >= 90 ? 'L3' : b.trustScore >= 70 ? 'L2' : b.trustScore >= 40 ? 'L1' : 'L0'} label={b.trustScore >= 90 ? 'Đối tác nổi bật' : b.trustScore >= 70 ? 'Đáng tin cậy' : 'Đang xây dựng'} />
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{b.activeListings} {lang === 'VI' ? 'tin đang đăng' : 'active listings'}</span>
                <span className="text-[#1E6FE8] font-medium">{b.trustScore}/100</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Listing Detail ───────────────────────────────────────────────────────────

function DetailView({ listing, lang, onBack, onSaveToggle }: { listing: Listing; lang: Lang; onBack: () => void; onSaveToggle: (id: string) => void }) {
  const [comment, setComment] = useState('')
  const [comments, setComments] = useState([
    { id: 1, author: 'Thảo Nguyên', text: lang === 'VI' ? 'Bé này dễ thương quá! Breeder có ship ra Hà Nội không?' : 'So cute! Can you ship to Hanoi?', time: '2h' },
    { id: 2, author: listing.breeder.name, text: lang === 'VI' ? 'Chào bạn, shop có thể ship toàn quốc! DM để biết thêm.' : 'Hi! We ship nationwide. DM for details.', time: '1h', isBreeder: true },
  ])

  return (
    <div className="max-w-[1200px] mx-auto px-5 lg:px-8 py-6">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-500 text-sm hover:text-slate-900 transition-colors mb-5">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M10 12 6 8l4-4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        {lang === 'VI' ? 'Quay lại' : 'Back'}
      </button>
      <div className="mb-5"><DisclaimerBanner lang={lang} /></div>
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 lg:flex-[1.4]">
          <div className="rounded-2xl overflow-hidden bg-slate-100 aspect-[4/3] mb-3">
            <img src={listing.mediaUrl} alt={listing.breed} className="w-full h-full object-cover" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2].map(i => (
              <div key={i} className={`rounded-xl overflow-hidden aspect-square bg-slate-100 cursor-pointer ${i === 0 ? 'ring-2 ring-[#1E6FE8]' : 'opacity-60 hover:opacity-100 transition-opacity'}`}>
                <img src={listing.mediaUrl} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
          {/* Vaccine evidence */}
          {listing.evidenceUrls && listing.evidenceUrls.length > 0 && (
            <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-xs font-semibold text-amber-700 mb-2">Bằng chứng vaccine</p>
              <div className="flex gap-2">
                {listing.evidenceUrls.map((url, i) => (
                  <div key={i} className="w-20 h-16 rounded-lg overflow-hidden bg-amber-100"><img src={url} alt="Vaccine evidence" className="w-full h-full object-cover" /></div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex-1 lg:sticky lg:top-24 lg:self-start">
          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-xl font-bold text-slate-900 mb-1 leading-snug">{lang === 'VI' ? listing.titleVI : listing.title}</h1>
                <p className="text-2xl font-bold text-[#1E6FE8]">{listing.price}</p>
              </div>
              <button onClick={() => onSaveToggle(listing.id)} className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center hover:border-red-200 hover:bg-red-50 transition-all">
                <svg width="18" height="18" viewBox="0 0 18 18" fill={listing.saved ? '#EF4444' : 'none'} stroke={listing.saved ? '#EF4444' : '#94A3B8'} strokeWidth="1.5">
                  <path d="M9 15S2 11 2 6.5C2 4.57 3.57 3 5.5 3c1.09 0 2.07.5 2.75 1.28L9 4.58l.75-.3A3.5 3.5 0 0 1 12.5 3c1.93 0 3.5 1.57 3.5 3.5C16 11 9 15 9 15Z" />
                </svg>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[{ label: lang === 'VI' ? 'Giống' : 'Breed', value: listing.breed }, { label: lang === 'VI' ? 'Tuổi' : 'Age', value: `${listing.ageMonths} ${lang === 'VI' ? 'tháng' : 'months'}` }, { label: lang === 'VI' ? 'Giới tính' : 'Gender', value: lang === 'VI' ? (listing.gender === 'male' ? 'Đực' : 'Cái') : listing.gender }, { label: lang === 'VI' ? 'Khu vực' : 'Location', value: listing.location }, { label: 'Vaccine', value: listing.vaccineStatus }, { label: lang === 'VI' ? 'Tẩy giun' : 'Deworming', value: listing.dewormingStatus }].map(m => (
                <div key={m.label} className="bg-slate-50 rounded-lg px-3 py-2">
                  <p className="text-[10px] text-slate-400 font-medium mb-0.5">{m.label}</p>
                  <p className="text-xs font-semibold text-slate-800">{m.value}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 mb-5">
              {(lang === 'VI' ? listing.personalityVI : listing.personality).map(tag => <span key={tag} className="px-2.5 py-1 bg-blue-50 text-[#1E6FE8] text-xs font-medium rounded-full">{tag}</span>)}
            </div>
            <p className="text-sm text-slate-600 leading-relaxed mb-5">{lang === 'VI' ? listing.descriptionVI : listing.description}</p>
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl mb-5">
              <img src={listing.breeder.avatar} alt={listing.breeder.name} className="w-10 h-10 rounded-full object-cover" />
              <div className="flex-1"><div className="flex items-center gap-2"><p className="text-sm font-semibold text-slate-900">{listing.breeder.name}</p>{listing.breeder.verified && <VerifiedBadge />}</div><p className="text-xs text-slate-400">{listing.breeder.location}</p></div>
            </div>
            <div className="flex flex-col gap-2">
              <button className="w-full py-3 bg-[#1E6FE8] text-white text-sm font-semibold rounded-full hover:bg-[#1D4ED8] transition-colors">{lang === 'VI' ? '💬 Nhắn tin' : '💬 Message'}</button>
              <div className="grid grid-cols-2 gap-2">
                <button className="py-2.5 border border-slate-200 text-slate-700 text-sm font-medium rounded-full hover:border-slate-300 transition-colors">{lang === 'VI' ? 'Chia sẻ' : 'Share'}</button>
                <button className="py-2.5 border border-slate-200 text-slate-500 text-sm font-medium rounded-full hover:border-red-200 hover:text-red-500 transition-colors">{lang === 'VI' ? 'Báo cáo' : 'Report'}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Comments */}
      <div className="mt-8 bg-white rounded-2xl border border-slate-100 p-6">
        <h2 className="font-semibold text-slate-900 mb-5">{lang === 'VI' ? `Bình luận (${comments.length})` : `Comments (${comments.length})`}</h2>
        <div className="space-y-4 mb-6">
          {comments.map(c => (
            <div key={c.id} className="flex gap-3">
              <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${(c as any).isBreeder ? 'bg-[#1E6FE8] text-white' : 'bg-slate-100 text-slate-600'}`}>{c.author[0]}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-xs font-semibold text-slate-900">{c.author}</p>
                  {(c as any).isBreeder && <VerifiedBadge size="xs" />}
                  <p className="text-[10px] text-slate-400">{c.time}</p>
                </div>
                <p className="text-sm text-slate-600">{c.text}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <div className="w-8 h-8 rounded-full bg-[#1E6FE8] flex items-center justify-center text-xs font-bold text-white flex-shrink-0">Y</div>
          <div className="flex-1 flex gap-2">
            <input type="text" value={comment} onChange={e => setComment(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && comment.trim()) { setComments([...comments, { id: Date.now(), author: 'You', text: comment, time: 'Now' }]); setComment('') } }} placeholder={lang === 'VI' ? 'Viết bình luận…' : 'Write a comment…'} className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#1E6FE8]/20 focus:border-[#1E6FE8] transition-all" />
            <button onClick={() => { if (comment.trim()) { setComments([...comments, { id: Date.now(), author: 'You', text: comment, time: 'Now' }]); setComment('') } }} className="px-4 py-2 bg-[#1E6FE8] text-white text-sm font-medium rounded-full hover:bg-[#1D4ED8] transition-colors">{lang === 'VI' ? 'Gửi' : 'Send'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [lang, setLang] = useState<Lang>('VI')
  const [view, setView] = useState<View>('landing')
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null)
  const [selectedBreeder, setSelectedBreeder] = useState<BreederProfile>(sampleBreeders[0])
  const [listings, setListings] = useState<Listing[]>(sampleListings)
  const [breeders, setBreeders] = useState<BreederProfile[]>(sampleBreeders)

  const handleSelectListing = (l: Listing) => { setSelectedListing(l); setView('detail') }
  const handleSaveToggle = (id: string) => {
    setListings(prev => prev.map(l => l.id === id ? { ...l, saved: !l.saved } : l))
    if (selectedListing?.id === id) setSelectedListing(prev => prev ? { ...prev, saved: !prev.saved } : null)
  }

  const handleApplyTemplate = (t: TemplateId) => {
    setBreeders(prev => prev.map(b => b.id === selectedBreeder.id ? { ...b, template: t } : b))
    setSelectedBreeder(prev => ({ ...prev, template: t }))
    setView('farm-detail')
  }

  const isAdminView = view === 'admin'

  return (
    <div className="min-h-screen bg-[#F2F4F8]">
      <Header lang={lang} setLang={setLang} view={view} setView={setView} unreadCount={3} isAdmin={isAdminView} />

      {view === 'landing' && (
        <LandingView lang={lang} listings={listings} setView={setView} onSelectListing={handleSelectListing} onSaveToggle={handleSaveToggle} />
      )}
      {view === 'feed' && (
        <FeedView lang={lang} listings={listings} onSelectListing={handleSelectListing} onSaveToggle={handleSaveToggle} />
      )}
      {view === 'detail' && selectedListing && (
        <DetailView listing={selectedListing} lang={lang} onBack={() => setView('feed')} onSaveToggle={handleSaveToggle} />
      )}
      {view === 'farm-detail' && (
        <FarmDetail
          breeder={selectedBreeder}
          lang={lang}
          isOwner={true}
          onChangeTemplate={() => setView('template-picker')}
          onFarmHealth={() => setView('farm-health')}
          listings={listings.filter(l => l.breeder.id === selectedBreeder.id)}
        />
      )}
      {view === 'template-picker' && (
        <TemplatePicker currentTemplate={selectedBreeder.template} onApply={handleApplyTemplate} onBack={() => setView('farm-detail')} />
      )}
      {view === 'farm-health' && (
        <FarmHealth breeder={selectedBreeder} lang={lang} onBack={() => setView('farm-detail')} />
      )}
      {view === 'admin' && (
        <AdminConsole lang={lang} onBack={() => setView('landing')} />
      )}
    </div>
  )
}
