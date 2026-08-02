import type { BreederProfile, Lang } from '../data'
import { getTrustLevel, getEffectiveTrust } from '../data'
import { TrustLevelChip } from '../components/Shared'

export function FarmHealth({ breeder, lang, onBack }: { breeder: BreederProfile; lang: Lang; onBack: () => void }) {
  const eff = getEffectiveTrust(breeder.trustScore, breeder.penaltyPoints)
  const { level, label } = getTrustLevel(eff, breeder.verified)
  const isPending = breeder.verificationStatus === 'pending_review'
  const isRejected = breeder.verificationStatus === 'rejected' || breeder.verificationStatus === 'suspended'

  const scoreBreakdown = [
    { label: 'Xác minh', key: 'verified', max: 30, val: breeder.verified ? 30 : 0, done: breeder.verified },
    { label: 'Checklist chăm sóc', key: 'checklist', max: 15, val: Math.min(breeder.checklist.filter(c => c.done).length * 3, 15), done: breeder.checklist.filter(c => c.done).length >= 3 },
    { label: 'Cam kết', key: 'commitments', max: 15, val: Math.min(breeder.commitments.length * 7, 15), done: breeder.commitments.length >= 2 },
    { label: 'Liên hệ (phone/zalo/FB)', key: 'contact', max: 15, val: Object.values(breeder.contact).filter(Boolean).length >= 2 ? 15 : Object.values(breeder.contact).filter(Boolean).length >= 1 ? 7 : 0, done: Object.values(breeder.contact).filter(Boolean).length >= 1 },
    { label: 'Môi trường chăm sóc', key: 'care', max: 15, val: breeder.careEnvironment ? 15 : 0, done: !!breeder.careEnvironment },
    { label: 'Tin đăng active', key: 'listings', max: 10, val: Math.min(breeder.activeListings * 2, 10), done: breeder.activeListings > 0 },
  ]

  return (
    <div className="max-w-[1200px] mx-auto px-5 lg:px-8 py-8">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-500 text-sm hover:text-slate-900 transition-colors mb-6">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M10 12 6 8l4-4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        Quay lại hồ sơ trại
      </button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sức khỏe trại</h1>
          <p className="text-slate-500 text-sm mt-1">Farm Health · {breeder.name}</p>
        </div>
        <span className="text-xs text-slate-400 font-medium bg-slate-100 px-2 py-1 rounded-lg">NEW</span>
      </div>

      {/* Status banners */}
      {isPending && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5 flex items-center gap-3">
          <span className="text-amber-500 text-lg">⏳</span>
          <p className="text-sm text-amber-800 font-medium">Hồ sơ đang chờ admin xác minh. Điểm sẽ cập nhật sau khi được duyệt.</p>
        </div>
      )}
      {isRejected && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5 flex items-center gap-3">
          <span className="text-red-500 text-lg">⛔</span>
          <p className="text-sm text-red-800 font-medium">Hồ sơ bị từ chối / tạm khóa. Liên hệ hỗ trợ để biết thêm chi tiết.</p>
        </div>
      )}

      {/* Score Hero */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 lg:p-8 mb-5">
        <div className="flex flex-col lg:flex-row items-center lg:items-start gap-8">
          {/* Ring */}
          <div className="relative w-32 h-32 flex-shrink-0">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="42" fill="none" stroke="#E2E8F0" strokeWidth="9" />
              <circle
                cx="50" cy="50" r="42"
                fill="none"
                stroke={eff >= 70 ? '#059669' : eff >= 40 ? '#1E6FE8' : '#94A3B8'}
                strokeWidth="9"
                strokeDasharray={`${(eff / 100) * 264} 264`}
                strokeLinecap="round"
                className="transition-all duration-700"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-slate-900">{eff}</span>
              <span className="text-xs text-slate-400">/100</span>
            </div>
          </div>

          <div className="flex-1 text-center lg:text-left">
            <div className="flex items-center gap-3 justify-center lg:justify-start mb-2">
              <TrustLevelChip level={level} label={label} />
              {breeder.verificationStatus === 'verified' && (
                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-xs font-medium px-2 py-0.5 rounded-full border border-emerald-200">✓ Đã xác minh</span>
              )}
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-1">Điểm tin cậy: {eff}/100</h2>
            {breeder.penaltyPoints > 0 && (
              <p className="text-sm text-red-600 font-medium mb-2">−{breeder.penaltyPoints} từ vi phạm đã xác nhận (Điểm gốc: {breeder.trustScore}/100)</p>
            )}
            <p className="text-sm text-slate-500 leading-relaxed max-w-lg">
              Điểm này là tín hiệu tham khảo nội bộ, dựa trên mức độ minh bạch hồ sơ và bài đăng. Không phải đánh giá giao dịch hay sức khỏe thú.
            </p>
          </div>
        </div>
      </div>

      {/* Metric tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {[
          { label: 'Điểm tin cậy', value: `${eff}/100`, sub: breeder.penaltyPoints > 0 ? `−${breeder.penaltyPoints}` : 'Không vi phạm', color: 'text-[#1E6FE8]' },
          { label: 'Cấp', value: level, sub: label, color: level === 'L3' ? 'text-amber-600' : level === 'L2' ? 'text-emerald-600' : 'text-slate-500' },
          { label: 'Vi phạm active', value: `${breeder.violations.length}`, sub: breeder.violations.length === 0 ? 'Chưa có' : 'Đã xác nhận', color: breeder.violations.length > 0 ? 'text-red-600' : 'text-emerald-600' },
          { label: 'Tin đang đăng', value: `${breeder.activeListings}`, sub: 'Published', color: 'text-slate-900' },
        ].map(tile => (
          <div key={tile.label} className="bg-white rounded-xl border border-slate-100 p-5">
            <p className="text-xs text-slate-400 font-medium mb-1">{tile.label}</p>
            <p className={`text-2xl font-bold mb-0.5 ${tile.color}`}>{tile.value}</p>
            <p className="text-xs text-slate-400">{tile.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Violations */}
        <div className="bg-white rounded-xl border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">Vi phạm đã xác nhận</h3>
            <span className="text-xs font-medium bg-slate-100 text-slate-500 px-2 py-0.5 rounded">SHIPPED</span>
          </div>
          {breeder.violations.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-2xl mb-2">✅</p>
              <p className="font-medium text-slate-700 text-sm">Chưa có báo cáo được xác nhận</p>
              <p className="text-xs text-slate-400 mt-1">Giữ hồ sơ trung thực để duy trì uy tín</p>
            </div>
          ) : (
            <div className="space-y-3">
              {breeder.violations.map(v => (
                <div key={v.id} className="flex items-start justify-between p-3 bg-red-50 border border-red-100 rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-red-800">{v.reason}</p>
                    <p className="text-xs text-red-400 mt-0.5">{v.date}</p>
                  </div>
                  <span className="text-sm font-bold text-red-600 flex-shrink-0 ml-3">−{v.points} điểm</span>
                </div>
              ))}
            </div>
          )}
          {/* Stake CTA (disabled) */}
          <div className="mt-4 pt-4 border-t border-slate-100">
            <button disabled className="w-full py-2.5 border border-slate-200 text-slate-400 text-sm font-medium rounded-full cursor-not-allowed flex items-center justify-center gap-2">
              🔒 Ký quỹ khôi phục
              <span className="text-[10px] bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full font-normal">Sắp có</span>
            </button>
          </div>
        </div>

        {/* Signal checklist */}
        <div className="bg-white rounded-xl border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">Tín hiệu tin cậy</h3>
            <span className="text-xs font-medium bg-blue-50 text-blue-500 px-2 py-0.5 rounded">SHIPPED</span>
          </div>
          <div className="space-y-2">
            {scoreBreakdown.map(s => (
              <div key={s.key} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <div className="flex items-center gap-2">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${s.done ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                    {s.done ? '✓' : '○'}
                  </span>
                  <span className={`text-sm ${s.done ? 'text-slate-800' : 'text-slate-400'}`}>{s.label}</span>
                </div>
                <div className="text-right">
                  <span className={`text-sm font-bold ${s.done ? 'text-emerald-600' : 'text-slate-300'}`}>{s.val}</span>
                  <span className="text-xs text-slate-300">/{s.max}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Improve */}
        <div className="bg-white rounded-xl border border-slate-100 p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Cải thiện điểm</h3>
          <div className="space-y-3">
            {scoreBreakdown.filter(s => !s.done).map(s => (
              <div key={s.key} className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                <div className="w-6 h-6 bg-[#1E6FE8] rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs">+{s.max}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">Hoàn thiện: {s.label}</p>
                  <p className="text-xs text-slate-400">Tối đa +{s.max} điểm</p>
                </div>
                <button className="ml-auto text-xs text-[#1E6FE8] font-medium hover:underline flex-shrink-0">Cập nhật →</button>
              </div>
            ))}
            {scoreBreakdown.every(s => s.done) && (
              <div className="text-center py-4">
                <p className="text-2xl mb-2">🏆</p>
                <p className="text-sm font-medium text-slate-700">Đã hoàn thiện tất cả tín hiệu!</p>
              </div>
            )}
          </div>
          <div className="mt-4 flex gap-2">
            <button className="flex-1 py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-full hover:border-[#1E6FE8] hover:text-[#1E6FE8] transition-colors">Chỉnh sửa hồ sơ</button>
            <button className="flex-1 py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-full hover:border-[#1E6FE8] hover:text-[#1E6FE8] transition-colors">Xem tin đăng</button>
          </div>
        </div>

        {/* Deals — Coming soon */}
        <div className="bg-slate-50 rounded-xl border border-dashed border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-400">Giao dịch</h3>
            <span className="text-xs font-medium bg-slate-200 text-slate-400 px-2 py-0.5 rounded">DESIGN NOW / DATA LATER</span>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { label: 'Giao dịch thành công', value: '—' },
              { label: 'Giao dịch thất bại', value: '—' },
            ].map(d => (
              <div key={d.label} className="bg-white/60 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-slate-300 mb-0.5">{d.value}</p>
                <p className="text-[10px] text-slate-300">{d.label}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 text-center">Chưa theo dõi giao dịch trong app — MVP chưa triển khai</p>
          <div className="mt-4 flex gap-2">
            <button disabled className="flex-1 py-2 bg-slate-200 text-slate-400 text-xs font-medium rounded-full cursor-not-allowed">
              Deals · Sắp có
            </button>
          </div>
        </div>
      </div>

      {/* Chart placeholder */}
      <div className="mt-5 bg-white rounded-xl border border-dashed border-slate-200 p-8 text-center">
        <p className="text-2xl mb-2">📈</p>
        <p className="font-medium text-slate-400 text-sm">Biểu đồ điểm tin cậy theo thời gian</p>
        <p className="text-xs text-slate-300 mt-1">OUT OF SCOPE MVP — Placeholder layout</p>
      </div>

      {/* Disclaimer */}
      <div className="mt-5 bg-slate-50 rounded-xl border border-slate-200 p-4">
        <p className="text-xs text-slate-400 leading-relaxed">
          <span className="font-semibold text-slate-500">Lưu ý:</span> Điểm tin cậy là tín hiệu tham khảo nội bộ dựa trên mức độ minh bạch hồ sơ. Không phản ánh chất lượng thú cưng, không bảo lãnh giao dịch. Pet Health Care không xử lý thanh toán.
        </p>
      </div>
    </div>
  )
}
