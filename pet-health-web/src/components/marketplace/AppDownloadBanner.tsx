import type { Lang } from "@/lib/types";
import { t } from "@/i18n";
import { IOS_APP_STORE_URL } from "@/lib/config";

export function AppDownloadBanner({ lang }: { lang: Lang }) {
  return (
    <div className="bg-gradient-to-r from-[#1E6FE8] to-[#2563EB] rounded-2xl p-6 lg:p-8 flex flex-col lg:flex-row items-center gap-6 text-white">
      <div className="flex-1">
        <p className="text-sm font-semibold text-blue-100 mb-1">
          Pet Health Care App
        </p>
        <h3 className="text-xl lg:text-2xl font-bold mb-2">
          {t(lang, "app.banner.need")}
        </h3>
        <p className="text-sm text-blue-100 leading-relaxed max-w-md">
          {t(lang, "app.banner.desc")}
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <a
          href={IOS_APP_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 bg-black text-white px-5 py-3 rounded-xl hover:bg-gray-900 transition-colors"
        >
          <div>
            <p className="text-[9px] opacity-70">Download on the</p>
            <p className="text-sm font-semibold">App Store</p>
          </div>
        </a>
        <span className="flex items-center gap-2.5 bg-black/60 text-white/80 px-5 py-3 rounded-xl cursor-default">
          <div>
            <p className="text-[9px] opacity-70">Coming soon on</p>
            <p className="text-sm font-semibold">Google Play</p>
          </div>
        </span>
      </div>
    </div>
  );
}
