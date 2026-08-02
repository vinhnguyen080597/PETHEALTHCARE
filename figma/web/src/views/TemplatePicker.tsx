import { useState } from 'react'
import type { TemplateId } from '../data'
import { templateMeta } from '../data'

const templatePreviews: Record<TemplateId, { bg: string; text: string; accent: string; preview: string }> = {
  T1: {
    bg: 'from-[#1E6FE8] to-[#2563EB]',
    text: 'text-white',
    accent: '#1E6FE8',
    preview: 'Hero xanh gradient · Metric strip · Trust panel bên phải',
  },
  T2: {
    bg: 'bg-slate-900',
    text: 'text-white',
    accent: '#0F172A',
    preview: 'Cover ảnh full-bleed · Story 2 cột · Listings grid dưới',
  },
  T3: {
    bg: 'bg-violet-50',
    text: 'text-violet-900',
    accent: '#7C3AED',
    preview: 'Metric mỏng · Listings grid ngay · Accent tím',
  },
  T4: {
    bg: 'bg-white',
    text: 'text-slate-900',
    accent: '#059669',
    preview: 'Surface trắng · Story + Cam kết nổi · Thoáng',
  },
  T5: {
    bg: 'bg-amber-900',
    text: 'text-white',
    accent: '#B45309',
    preview: 'Banner Credentials · Navy/gold · Trust + Verified nhấn',
  },
}

export function TemplatePicker({
  currentTemplate,
  onApply,
  onBack,
}: {
  currentTemplate: TemplateId
  onApply: (t: TemplateId) => void
  onBack: () => void
}) {
  const [selected, setSelected] = useState<TemplateId>(currentTemplate)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const tids: TemplateId[] = ['T1', 'T2', 'T3', 'T4', 'T5']

  return (
    <div className="max-w-[1200px] mx-auto px-5 lg:px-8 py-8">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-500 text-sm hover:text-slate-900 transition-colors mb-6">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M10 12 6 8l4-4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        Quay lại hồ sơ trại
      </button>

      <div className="flex items-start justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Chọn giao diện trang trại</h1>
          <p className="text-slate-500 text-sm mt-1">Chọn 1 trong 5 template. Nội dung hồ sơ giữ nguyên khi đổi.</p>
        </div>
        <span className="hidden sm:inline-block text-xs text-slate-400 font-medium bg-slate-100 px-2 py-1 rounded-lg">NEW</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mt-8">
        {/* Template grid */}
        <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {tids.map((tid) => {
            const meta = templateMeta[tid]
            const preview = templatePreviews[tid]
            const isSelected = selected === tid
            const isCurrent = currentTemplate === tid

            return (
              <button
                key={tid}
                onClick={() => setSelected(tid)}
                className={`text-left rounded-xl border-2 overflow-hidden transition-all focus:outline-none focus:ring-2 focus:ring-[#1E6FE8]/40 ${isSelected ? 'border-[#1E6FE8] shadow-md shadow-blue-100' : 'border-transparent hover:border-slate-200'}`}
              >
                {/* Mini hero preview */}
                <div className={`h-24 ${preview.bg} flex items-center justify-center p-4 relative`}>
                  <div className="w-full">
                    <div className={`text-xs font-bold truncate mb-1 ${preview.text}`}>Cattery Miu House</div>
                    <div className="flex items-center gap-1.5">
                      <div className={`h-1.5 rounded-full flex-1`} style={{ backgroundColor: preview.accent, opacity: 0.6 }} />
                      <div className={`h-1.5 rounded-full w-8`} style={{ backgroundColor: preview.accent, opacity: 0.3 }} />
                    </div>
                  </div>
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-[#1E6FE8] rounded-full flex items-center justify-center">
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2.5 5l2 2L7.5 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </div>
                  )}
                </div>
                {/* Card body */}
                <div className="p-3 bg-white">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-slate-900">{tid}</span>
                    <span className="text-xs font-semibold text-slate-700">{meta.nameVI}</span>
                    {isCurrent && <span className="text-[10px] font-medium text-[#1E6FE8] bg-blue-50 px-1.5 py-0.5 rounded-full">Hiện tại</span>}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{preview.preview}</p>
                </div>
              </button>
            )
          })}
        </div>

        {/* Large preview panel */}
        <div className="lg:col-span-2 sticky top-24 self-start">
          <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
            <div className={`${templatePreviews[selected].bg} p-8 flex flex-col items-center justify-center min-h-48 text-center`}>
              <div className={`text-lg font-bold mb-1 ${templatePreviews[selected].text}`}>{selected} — {templateMeta[selected].nameVI}</div>
              <div className={`text-sm opacity-70 ${templatePreviews[selected].text}`}>{templateMeta[selected].nameEN}</div>
            </div>
            <div className="p-5">
              <p className="text-sm text-slate-700 leading-relaxed mb-4">{templateMeta[selected].description}</p>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-5 h-5 rounded-full border-2 border-slate-200" style={{ backgroundColor: templateMeta[selected].accent }} />
                <span className="text-xs text-slate-500 font-mono">{templateMeta[selected].accent}</span>
              </div>
              <button
                onClick={() => setConfirmOpen(true)}
                disabled={selected === currentTemplate}
                className="w-full py-3 bg-[#1E6FE8] text-white text-sm font-semibold rounded-full hover:bg-[#1D4ED8] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {selected === currentTemplate ? 'Đang dùng template này' : `Áp dụng ${selected}`}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm modal */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setConfirmOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <h2 className="font-bold text-slate-900 mb-2">Áp dụng template {selected}?</h2>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              Giao diện trang trại sẽ đổi sang <strong>{templateMeta[selected].nameVI}</strong>. Nội dung hồ sơ giữ nguyên. Có thể đổi lại bất kỳ lúc nào.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmOpen(false)} className="flex-1 py-2.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-full">Huỷ</button>
              <button
                onClick={() => { onApply(selected); setConfirmOpen(false) }}
                className="flex-1 py-2.5 bg-[#1E6FE8] text-white text-sm font-semibold rounded-full hover:bg-[#1D4ED8] transition-colors"
              >
                Áp dụng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
