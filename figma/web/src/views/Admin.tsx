import { useState } from 'react'
import type { AdminSection, Lang } from '../data'
import { sampleAdminRequests, sampleBreeders, featureFlags } from '../data'
import type { AdminRequest } from '../data'

// ─── Shared admin primitives ──────────────────────────────────────────────────

function StatusChip({ status }: { status: string }) {
  const map: Record<string, string> = {
    waiting: 'bg-amber-50 text-amber-700 border-amber-200',
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rejected: 'bg-red-50 text-red-600 border-red-200',
    resolved: 'bg-slate-100 text-slate-500 border-slate-200',
    dismissed: 'bg-slate-100 text-slate-400 border-slate-200',
  }
  const labelMap: Record<string, string> = {
    waiting: 'Chờ duyệt',
    approved: 'Đã duyệt',
    rejected: 'Từ chối',
    resolved: 'Đã xử lý',
    dismissed: 'Bỏ qua',
  }
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${map[status] || map.waiting}`}>
      {labelMap[status] || status}
    </span>
  )
}

function TypeChip({ type }: { type: string }) {
  const map: Record<string, string> = {
    breeder: 'bg-blue-50 text-blue-700',
    listing: 'bg-violet-50 text-violet-700',
    report: 'bg-red-50 text-red-600',
  }
  const labels: Record<string, string> = { breeder: 'Breeder', listing: 'Tin đăng', report: 'Báo cáo' }
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${map[type]}`}>{labels[type] || type}</span>
  )
}

function PenaltyBadge({ points, count }: { points: number; count: number }) {
  if (points === 0) return null
  return (
    <span className="inline-flex items-center gap-1 bg-red-50 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-red-200">
      −{points} điểm · {count} vi phạm
    </span>
  )
}

function ConfirmModal({
  open,
  type,
  onConfirm,
  onCancel,
}: {
  open: boolean
  type: 'violation' | 'suspend'
  onConfirm: () => void
  onCancel: () => void
}) {
  if (!open) return null
  const isViolation = type === 'violation'
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mx-auto mb-4">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="#DC2626" strokeWidth="2">
            <path d="M11 8v4M11 14.5v.5M3.5 18.5l7.5-15 7.5 15H3.5Z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 className="font-bold text-slate-900 text-center mb-2">
          {isViolation ? 'Xác nhận vi phạm?' : 'Tạm khóa breeder này?'}
        </h2>
        <p className="text-sm text-slate-500 text-center leading-relaxed mb-6">
          {isViolation
            ? 'Hành động này sẽ thêm −10 điểm vào Farm Health của breeder. Chỉ vi phạm đã được admin xác nhận mới ảnh hưởng đến điểm.'
            : 'Breeder sẽ không thể đăng tin hoặc liên hệ mới trong thời gian bị khóa. Có thể mở lại sau.'}
        </p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-2.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-full">Huỷ</button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-full hover:bg-red-700 transition-colors"
          >
            {isViolation ? 'Xác nhận vi phạm (−10đ)' : 'Tạm khóa'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-xl flex items-center gap-3 animate-in slide-in-from-bottom">
      <span className="text-emerald-400">✓</span>
      {message}
      <button onClick={onClose} className="text-slate-400 hover:text-white ml-1">✕</button>
    </div>
  )
}

// ─── AdminHome ────────────────────────────────────────────────────────────────

function AdminHome({ setSection }: { setSection: (s: AdminSection) => void }) {
  const waiting = sampleAdminRequests.filter(r => r.status === 'waiting')
  const byType = (t: string) => waiting.filter(r => r.type === t).length

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900 mb-6">Admin Home</h1>

      {/* Metric row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Yêu cầu chờ duyệt', value: waiting.length, color: 'text-amber-600', action: () => setSection('requests') },
          { label: 'Breeder chờ xác minh', value: byType('breeder'), color: 'text-blue-600', action: () => setSection('breeders') },
          { label: 'Tin đăng chờ duyệt', value: byType('listing'), color: 'text-violet-600', action: () => setSection('listings') },
          { label: 'Báo cáo chưa xử lý', value: byType('report'), color: 'text-red-600', action: () => setSection('reports') },
        ].map(m => (
          <button key={m.label} onClick={m.action} className="bg-white rounded-xl border border-slate-100 p-5 text-left hover:shadow-sm hover:border-blue-100 transition-all">
            <p className={`text-3xl font-bold mb-1 ${m.color}`}>{m.value}</p>
            <p className="text-xs text-slate-500 font-medium">{m.label}</p>
          </button>
        ))}
      </div>

      {/* Việc cần làm hôm nay */}
      <div className="bg-white rounded-xl border border-slate-100 p-6 mb-5">
        <h2 className="font-semibold text-slate-900 mb-4">Việc cần làm hôm nay</h2>
        <div className="space-y-3">
          {waiting.slice(0, 5).map(req => (
            <div key={req.id} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
              <TypeChip type={req.type} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{req.titleVI}</p>
                <p className="text-xs text-slate-400 truncate">{req.subtitle}</p>
              </div>
              <p className="text-xs text-slate-300 flex-shrink-0">{req.date}</p>
            </div>
          ))}
        </div>
        <button onClick={() => setSection('requests')} className="mt-4 text-sm text-[#1E6FE8] font-medium hover:underline">
          Xem tất cả →
        </button>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: 'Tạo tin tức', icon: '📝', action: () => setSection('news') },
          { label: 'Quản lý users', icon: '👥', action: () => setSection('users') },
          { label: 'Feature flags', icon: '🚩', action: () => setSection('features') },
        ].map(a => (
          <button key={a.label} onClick={a.action} className="bg-white rounded-xl border border-slate-100 p-4 flex flex-col items-center gap-2 hover:shadow-sm hover:border-blue-100 transition-all">
            <span className="text-2xl">{a.icon}</span>
            <span className="text-sm font-medium text-slate-700">{a.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── RequestsQueue ────────────────────────────────────────────────────────────

function RequestsQueue() {
  const [filter, setFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [confirm, setConfirm] = useState<{ open: boolean; type: 'violation' | 'suspend'; reqId: string }>({ open: false, type: 'violation', reqId: '' })
  const [toast, setToast] = useState('')
  const [resolved, setResolved] = useState<Set<string>>(new Set())

  const filtered = sampleAdminRequests.filter(r => {
    if (filter !== 'all' && r.status !== filter) return false
    if (typeFilter !== 'all' && r.type !== typeFilter) return false
    return true
  })

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3500)
  }

  const handleConfirm = () => {
    setResolved(prev => new Set([...prev, confirm.reqId]))
    setConfirm({ open: false, type: 'violation', reqId: '' })
    showToast('Đã xác nhận vi phạm. Điểm trừ đã ghi vào Farm Health của breeder.')
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900 mb-5">Hàng chờ duyệt</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-5">
        <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1">
          {['all', 'waiting', 'approved', 'rejected', 'resolved'].map(s => (
            <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === s ? 'bg-[#1E6FE8] text-white' : 'text-slate-500 hover:text-slate-900'}`}>
              {s === 'all' ? 'Tất cả' : s === 'waiting' ? 'Chờ duyệt' : s === 'approved' ? 'Đã duyệt' : s === 'rejected' ? 'Từ chối' : 'Đã xử lý'}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1">
          {['all', 'breeder', 'listing', 'report'].map(t => (
            <button key={t} onClick={() => setTypeFilter(t)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${typeFilter === t ? 'bg-[#1E6FE8] text-white' : 'text-slate-500 hover:text-slate-900'}`}>
              {t === 'all' ? 'Tất cả loại' : t === 'breeder' ? 'Breeder' : t === 'listing' ? 'Tin đăng' : 'Báo cáo'}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map(req => {
          const isResolved = resolved.has(req.id)
          const effectiveStatus = isResolved ? 'resolved' : req.status

          return (
            <div key={req.id} className="bg-white rounded-xl border border-slate-100 p-5 hover:shadow-sm transition-all">
              <div className="flex flex-wrap items-start gap-2 mb-3">
                <TypeChip type={req.type} />
                <StatusChip status={effectiveStatus} />
                {req.penaltyPoints !== undefined && req.penaltyPoints > 0 && (
                  <PenaltyBadge points={req.penaltyPoints} count={req.violationCount || 1} />
                )}
                <p className="text-xs text-slate-300 ml-auto">{req.date}</p>
              </div>

              <div className="mb-3">
                <p className="font-semibold text-slate-900 text-sm mb-0.5">{req.titleVI}</p>
                <p className="text-xs text-slate-400">{req.subtitle}</p>
                <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">{req.body}</p>
              </div>

              {/* Vaccine evidence strip */}
              {req.type === 'listing' && req.evidenceUrls && req.evidenceUrls.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold text-amber-700">Bằng chứng vaccine</span>
                    <span className="text-[10px] text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">{req.vaccineStatus}</span>
                  </div>
                  <div className="flex gap-2">
                    {req.evidenceUrls.map((url, i) => (
                      <div key={i} className="w-20 h-16 rounded-lg overflow-hidden bg-amber-100 flex-shrink-0">
                        <img src={url} alt="Evidence" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Report reason */}
              {req.type === 'report' && req.reportReason && (
                <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-3">
                  <span className="text-xs font-medium text-red-700">Lý do: {req.reportReason.replace(/_/g, ' ')}</span>
                </div>
              )}

              {/* Actions */}
              {effectiveStatus === 'waiting' && (
                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-50">
                  {req.type === 'breeder' && (
                    <>
                      <button onClick={() => showToast('Đã xác minh breeder.')} className="px-4 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-full hover:bg-emerald-700 transition-colors">✓ Xác minh</button>
                      <button onClick={() => showToast('Đã từ chối.')} className="px-4 py-1.5 border border-red-200 text-red-600 text-xs font-semibold rounded-full hover:bg-red-50 transition-colors">✕ Từ chối</button>
                      <button onClick={() => setConfirm({ open: true, type: 'suspend', reqId: req.id })} className="px-4 py-1.5 border border-slate-200 text-slate-500 text-xs font-semibold rounded-full hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors">🔒 Tạm khóa</button>
                    </>
                  )}
                  {req.type === 'listing' && (
                    <>
                      <button onClick={() => showToast('Đã duyệt tin đăng.')} className="px-4 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-full hover:bg-emerald-700 transition-colors">✓ Duyệt</button>
                      <button onClick={() => showToast('Đã lưu trữ tin.')} className="px-4 py-1.5 border border-slate-200 text-slate-500 text-xs font-semibold rounded-full hover:border-red-200 hover:text-red-600 transition-colors">Archive</button>
                    </>
                  )}
                  {req.type === 'report' && (
                    <>
                      <button onClick={() => setConfirm({ open: true, type: 'violation', reqId: req.id })} className="px-4 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-full hover:bg-red-700 transition-colors">⚠ Xác nhận vi phạm</button>
                      <button onClick={() => showToast('Đã bỏ qua báo cáo.')} className="px-4 py-1.5 border border-slate-200 text-slate-500 text-xs font-semibold rounded-full hover:border-slate-300 transition-colors">Bỏ qua</button>
                    </>
                  )}
                </div>
              )}
              {effectiveStatus !== 'waiting' && (
                <p className="text-xs text-slate-300 pt-2 border-t border-slate-50">Đã xử lý — không thể thay đổi</p>
              )}
            </div>
          )
        })}
      </div>

      <ConfirmModal
        open={confirm.open}
        type={confirm.type}
        onConfirm={handleConfirm}
        onCancel={() => setConfirm({ open: false, type: 'violation', reqId: '' })}
      />
      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  )
}

// ─── Breeders Directory ───────────────────────────────────────────────────────

function BreedersDirectory() {
  const [toast, setToast] = useState('')
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const statusColor: Record<string, string> = {
    verified: 'text-emerald-600',
    pending_review: 'text-amber-600',
    unverified: 'text-slate-400',
    rejected: 'text-red-600',
    suspended: 'text-red-700',
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900 mb-5">Breeder Directory</h1>
      <div className="flex gap-2 mb-5">
        <input type="text" placeholder="Tìm breeder…" className="flex-1 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E6FE8]/20 focus:border-[#1E6FE8]" />
        <select className="border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-[#1E6FE8]/20">
          <option>Tất cả trạng thái</option>
          <option>verified</option>
          <option>pending_review</option>
          <option>suspended</option>
        </select>
      </div>
      <div className="space-y-3">
        {sampleBreeders.map(b => (
          <div key={b.id} className="bg-white rounded-xl border border-slate-100 p-5 hover:shadow-sm transition-all">
            <div className="flex items-start gap-4">
              <img src={b.avatar} alt={b.name} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <p className="font-semibold text-slate-900 text-sm">{b.name}</p>
                  <span className={`text-xs font-medium ${statusColor[b.verificationStatus]}`}>{b.verificationStatus}</span>
                  {b.penaltyPoints > 0 && <PenaltyBadge points={b.penaltyPoints} count={b.violations.length} />}
                </div>
                <p className="text-xs text-slate-400">{b.location} · {b.breederType} · {b.primarySpecies.join(', ')}</p>
                <p className="text-xs text-slate-400 mt-0.5">{b.activeListings} tin đang đăng · Điểm: {b.trustScore}/100</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                {b.verificationStatus === 'pending_review' && (
                  <button onClick={() => showToast(`Đã xác minh ${b.name}`)} className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-full hover:bg-emerald-700">✓ Xác minh</button>
                )}
                {b.verificationStatus !== 'suspended' && (
                  <button onClick={() => showToast(`Đã tạm khóa ${b.name}`)} className="px-3 py-1.5 border border-red-200 text-red-600 text-xs font-semibold rounded-full hover:bg-red-50">Khóa</button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  )
}

// ─── Reports ──────────────────────────────────────────────────────────────────

function AdminReports() {
  const [confirm, setConfirm] = useState(false)
  const [toast, setToast] = useState('')
  const reports = sampleAdminRequests.filter(r => r.type === 'report' && r.status === 'waiting')

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900 mb-5">Báo cáo chưa xử lý</h1>
      {reports.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-100 py-20 text-center">
          <p className="text-3xl mb-3">✅</p>
          <p className="font-semibold text-slate-700">Chưa có báo cáo mở</p>
          <p className="text-sm text-slate-400 mt-1">No open reports</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map(r => (
            <div key={r.id} className="bg-white rounded-xl border border-red-100 p-5">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <TypeChip type="report" />
                <span className="text-xs text-slate-400">{r.date}</span>
              </div>
              <p className="font-semibold text-slate-900 text-sm mb-0.5">{r.titleVI}</p>
              <p className="text-xs text-slate-400 mb-2">{r.subtitle}</p>
              <p className="text-sm text-slate-600 leading-relaxed mb-3">{r.body}</p>
              {r.reportReason && (
                <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-1.5 mb-3 inline-block">
                  <span className="text-xs font-medium text-red-700">Lý do: {r.reportReason.replace(/_/g, ' ')}</span>
                </div>
              )}
              <div className="flex gap-2 pt-2 border-t border-slate-50">
                <button onClick={() => setConfirm(true)} className="px-4 py-2 bg-red-600 text-white text-xs font-semibold rounded-full hover:bg-red-700 transition-colors">
                  ⚠ Xác nhận vi phạm (−10đ)
                </button>
                <button onClick={() => setToast('Đã bỏ qua báo cáo.')} className="px-4 py-2 border border-slate-200 text-slate-500 text-xs font-semibold rounded-full hover:border-slate-300 transition-colors">
                  Bỏ qua
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <ConfirmModal
        open={confirm}
        type="violation"
        onConfirm={() => { setConfirm(false); setToast('Đã xác nhận vi phạm. Điểm trừ đã ghi vào Farm Health của breeder.') }}
        onCancel={() => setConfirm(false)}
      />
      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  )
}

// ─── Feature Flags ────────────────────────────────────────────────────────────

function AdminFeatures() {
  const [flags, setFlags] = useState(featureFlags)
  const [toast, setToast] = useState('')

  const toggle = (key: string) => {
    setFlags(prev => prev.map(f => f.key === key ? { ...f, enabled: !f.enabled } : f))
    const flag = flags.find(f => f.key === key)
    if (flag) setToast(`${flag.enabled ? 'Tắt' : 'Bật'}: ${flag.label}`)
    setTimeout(() => setToast(''), 2500)
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900 mb-5">Feature Flags</h1>
      <div className="space-y-2">
        {flags.map(f => (
          <div key={f.key} className={`bg-white rounded-xl border ${f.scope === 'mobile-only' ? 'border-slate-100 opacity-60' : 'border-slate-100'} p-4 flex items-center justify-between`}>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-slate-900">{f.label}</p>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${f.scope === 'mobile-only' ? 'bg-orange-50 text-orange-600' : 'bg-slate-100 text-slate-500'}`}>{f.scope}</span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">{f.key}</p>
            </div>
            <button
              onClick={() => f.scope !== 'mobile-only' && toggle(f.key)}
              disabled={f.scope === 'mobile-only'}
              className={`relative w-12 h-6 rounded-full transition-colors ${f.enabled ? 'bg-[#1E6FE8]' : 'bg-slate-200'} ${f.scope === 'mobile-only' ? 'cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${f.enabled ? 'left-7' : 'left-1'}`} />
            </button>
          </div>
        ))}
      </div>
      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  )
}

// ─── Create News ──────────────────────────────────────────────────────────────

function AdminCreateNews() {
  const [toast, setToast] = useState('')
  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900 mb-5">Tạo tin tức / Thông báo</h1>
      <div className="bg-white rounded-xl border border-slate-100 p-6 space-y-4 max-w-2xl">
        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Danh mục</label>
          <select className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#1E6FE8]/20 focus:border-[#1E6FE8]">
            <option>Tin tức marketplace</option>
            <option>Mẹo chăm sóc thú</option>
            <option>Thông báo hệ thống</option>
            <option>Cross-sell Pet Care App</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Tiêu đề</label>
          <input type="text" placeholder="Tiêu đề bài viết…" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E6FE8]/20 focus:border-[#1E6FE8]" />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Nội dung</label>
          <textarea placeholder="Nội dung bài viết…" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm h-32 resize-none focus:outline-none focus:ring-2 focus:ring-[#1E6FE8]/20 focus:border-[#1E6FE8]" />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Ảnh bìa (URL)</label>
          <input type="text" placeholder="https://…" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E6FE8]/20 focus:border-[#1E6FE8]" />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">CTA (tuỳ chọn)</label>
          <input type="text" placeholder="Tải app Pet Health Care" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E6FE8]/20 focus:border-[#1E6FE8]" />
        </div>
        <div className="flex gap-2 pt-2">
          <button className="px-5 py-2.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-full hover:border-slate-300 transition-colors">Lưu nháp</button>
          <button onClick={() => { setToast('Đã đăng tin tức. Xuất hiện trên tab Tin tức Pet Feed.'); setTimeout(() => setToast(''), 3000) }} className="px-5 py-2.5 bg-[#1E6FE8] text-white text-sm font-semibold rounded-full hover:bg-[#1D4ED8] transition-colors">Đăng ngay</button>
        </div>
      </div>
      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  )
}

// ─── Users Hub ────────────────────────────────────────────────────────────────

function AdminUsers() {
  const [toast, setToast] = useState('')
  const users = [
    { id: 'u1', name: 'Thảo Nguyên', email: 'thao@example.com', role: 'sen', pets: 2 },
    { id: 'u2', name: 'Minh Hùng', email: 'hung@example.com', role: 'breeder', pets: 0 },
    { id: 'u3', name: 'Admin Test', email: 'admin@pethealthcare.app', role: 'admin', pets: 0 },
    { id: 'u4', name: 'Lan Phương', email: 'lan@example.com', role: 'sen', pets: 1 },
  ]
  const roleColor: Record<string, string> = {
    sen: 'bg-blue-50 text-blue-600',
    breeder: 'bg-violet-50 text-violet-700',
    admin: 'bg-red-50 text-red-600',
  }
  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-slate-900">Người dùng</h1>
        <button onClick={() => setToast('Tính năng tạo tài khoản sẽ mở form.')} className="px-4 py-2 bg-[#1E6FE8] text-white text-sm font-semibold rounded-full hover:bg-[#1D4ED8] transition-colors">+ Tạo tài khoản</button>
      </div>
      <div className="flex gap-2 mb-5">
        <input type="text" placeholder="Tìm email / tên…" className="flex-1 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E6FE8]/20 focus:border-[#1E6FE8]" />
        <select className="border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-600 bg-white focus:outline-none">
          <option>Tất cả roles</option>
          <option>sen</option>
          <option>breeder</option>
          <option>admin</option>
        </select>
      </div>
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        {users.map((u, i) => (
          <div key={u.id} className={`flex items-center gap-4 px-5 py-4 ${i < users.length - 1 ? 'border-b border-slate-50' : ''} hover:bg-slate-50 transition-colors`}>
            <div className="w-9 h-9 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {u.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900">{u.name}</p>
              <p className="text-xs text-slate-400">{u.email}</p>
            </div>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${roleColor[u.role]}`}>{u.role}</span>
            <p className="text-xs text-slate-400 hidden sm:block">{u.pets} pets</p>
            <div className="flex gap-1.5">
              <button onClick={() => setToast(`Đổi role ${u.name}`)} className="text-xs text-slate-500 hover:text-[#1E6FE8] border border-slate-200 px-2.5 py-1 rounded-full transition-colors">Role</button>
              <button onClick={() => setToast(`Act-as: ${u.name} — Optional web feature`)} className="text-xs text-slate-500 hover:text-[#1E6FE8] border border-slate-200 px-2.5 py-1 rounded-full transition-colors">Act as</button>
            </div>
          </div>
        ))}
      </div>
      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  )
}

// ─── Admin Console Layout ─────────────────────────────────────────────────────

const navItems: { key: AdminSection; label: string; icon: string }[] = [
  { key: 'home', label: 'Home', icon: '🏠' },
  { key: 'requests', label: 'Hàng chờ', icon: '📥' },
  { key: 'listings', label: 'Tin đăng', icon: '🐾' },
  { key: 'breeders', label: 'Breeders', icon: '🏡' },
  { key: 'reports', label: 'Báo cáo', icon: '⚠️' },
  { key: 'users', label: 'Users', icon: '👥' },
  { key: 'features', label: 'Feature flags', icon: '🚩' },
  { key: 'news', label: 'Tạo tin tức', icon: '📝' },
]

function AdminListingReview() {
  const [toast, setToast] = useState('')
  const listings = sampleAdminRequests.filter(r => r.type === 'listing')
  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900 mb-5">Duyệt tin đăng</h1>
      <div className="space-y-4">
        {listings.map(req => (
          <div key={req.id} className="bg-white rounded-xl border border-slate-100 overflow-hidden hover:shadow-sm transition-all">
            <div className="flex flex-col lg:flex-row">
              {/* Left: evidence */}
              <div className="lg:w-80 xl:w-96 flex-shrink-0 bg-slate-50 p-5 border-b lg:border-b-0 lg:border-r border-slate-100">
                {req.evidenceUrls && req.evidenceUrls.length > 0 ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <p className="text-xs font-semibold text-amber-700 mb-2">Bằng chứng vaccine ({req.vaccineStatus})</p>
                    <div className="flex gap-2">
                      {req.evidenceUrls.map((url, i) => (
                        <div key={i} className="w-24 h-20 rounded-lg overflow-hidden bg-amber-100">
                          <img src={url} alt="Evidence" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  req.vaccineStatus && req.vaccineStatus !== 'Chưa tiêm' ? (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                      <p className="text-xs font-semibold text-red-700 mb-1">⚠ Thiếu bằng chứng vaccine</p>
                      <p className="text-xs text-red-600">Tin khai đã tiêm ({req.vaccineStatus}) nhưng không có ảnh bằng chứng. Backend đã reject upload.</p>
                    </div>
                  ) : (
                    <div className="h-20 flex items-center justify-center text-slate-300 text-sm">Không có bằng chứng</div>
                  )
                )}
              </div>
              {/* Right: metadata + actions */}
              <div className="flex-1 p-5">
                <div className="flex items-start gap-2 mb-2">
                  <StatusChip status={req.status} />
                  <p className="text-xs text-slate-300">{req.date}</p>
                </div>
                <p className="font-semibold text-slate-900 text-sm mb-0.5">{req.titleVI}</p>
                <p className="text-xs text-slate-400 mb-3">{req.subtitle}</p>
                <p className="text-sm text-slate-600 leading-relaxed mb-4">{req.body}</p>
                {req.status === 'waiting' && (
                  <div className="flex gap-2">
                    <button onClick={() => setToast('Đã duyệt tin đăng.')} className="px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-full hover:bg-emerald-700 transition-colors">✓ Duyệt</button>
                    <button onClick={() => setToast('Đã archive tin.')} className="px-4 py-2 border border-slate-200 text-slate-500 text-xs font-semibold rounded-full hover:border-red-200 hover:text-red-600 transition-colors">Archive</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  )
}

export function AdminConsole({ lang, onBack }: { lang: Lang; onBack: () => void }) {
  const [section, setSection] = useState<AdminSection>('home')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const waiting = sampleAdminRequests.filter(r => r.status === 'waiting').length

  const renderSection = () => {
    switch (section) {
      case 'home': return <AdminHome setSection={setSection} />
      case 'requests': return <RequestsQueue />
      case 'listings': return <AdminListingReview />
      case 'breeders': return <BreedersDirectory />
      case 'reports': return <AdminReports />
      case 'users': return <AdminUsers />
      case 'features': return <AdminFeatures />
      case 'news': return <AdminCreateNews />
      default: return <AdminHome setSection={setSection} />
    }
  }

  return (
    <div className="min-h-screen bg-[#F2F4F8]">
      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-64px)]">
        {/* Sidebar (desktop) */}
        <aside className="hidden lg:flex flex-col w-56 xl:w-64 bg-white border-r border-slate-100 flex-shrink-0">
          <div className="p-4 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Admin Console</p>
          </div>
          <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
            {navItems.map(item => (
              <button
                key={item.key}
                onClick={() => setSection(item.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${section === item.key ? 'bg-blue-50 text-[#1E6FE8]' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
              >
                <span className="w-5 text-center">{item.icon}</span>
                {item.label}
                {item.key === 'requests' && waiting > 0 && (
                  <span className="ml-auto bg-[#EF4444] text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{waiting}</span>
                )}
              </button>
            ))}
          </nav>
          <div className="p-3 border-t border-slate-100">
            <button onClick={onBack} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors">
              ← Về Marketplace
            </button>
          </div>
        </aside>

        {/* Mobile top nav */}
        <div className="lg:hidden bg-white border-b border-slate-100 px-4 py-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">{navItems.find(n => n.key === section)?.label}</p>
            <button onClick={() => setMobileNavOpen(!mobileNavOpen)} className="text-slate-500 hover:text-slate-900">☰</button>
          </div>
          {mobileNavOpen && (
            <div className="grid grid-cols-4 gap-1 pt-2 pb-1">
              {navItems.map(item => (
                <button key={item.key} onClick={() => { setSection(item.key); setMobileNavOpen(false) }} className={`flex flex-col items-center gap-1 p-2 rounded-lg text-[10px] font-medium transition-all ${section === item.key ? 'bg-blue-50 text-[#1E6FE8]' : 'text-slate-500'}`}>
                  <span>{item.icon}</span>
                  {item.label.split(' ')[0]}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Main content */}
        <main className="flex-1 p-5 lg:p-8 overflow-y-auto">
          {renderSection()}
        </main>
      </div>
    </div>
  )
}
