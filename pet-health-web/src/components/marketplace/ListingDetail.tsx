"use client";

import { useState } from "react";
import Link from "next/link";
import type { Lang, Listing } from "@/lib/types";
import { genderLabel, t } from "@/i18n";
import { DisclaimerBanner } from "./DisclaimerBanner";
import { VerifiedBadge } from "./Badges";

export function ListingDetail({
  listing,
  lang,
}: {
  listing: Listing;
  lang: Lang;
}) {
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState([
    {
      id: 1,
      author: "Thảo Nguyên",
      text:
        lang === "VI"
          ? "Bé này dễ thương quá! Breeder có ship ra Hà Nội không?"
          : "So cute! Can you ship to Hanoi?",
      time: "2h",
      isBreeder: false,
    },
    {
      id: 2,
      author: listing.breeder.name,
      text:
        lang === "VI"
          ? "Chào bạn, shop có thể ship toàn quốc! Nhắn tin để biết thêm."
          : "Hi! We ship nationwide. Message for details.",
      time: "1h",
      isBreeder: true,
    },
  ]);
  const [activeMedia, setActiveMedia] = useState(0);
  const title = lang === "VI" ? listing.titleVI : listing.title;
  const description =
    lang === "VI" ? listing.descriptionVI : listing.description;
  const personality =
    lang === "VI" ? listing.personalityVI : listing.personality;
  const media = listing.mediaUrls.length
    ? listing.mediaUrls
    : [listing.mediaUrl];

  const sendComment = () => {
    if (!comment.trim()) return;
    setComments([
      ...comments,
      { id: Date.now(), author: "You", text: comment, time: "Now", isBreeder: false },
    ]);
    setComment("");
  };

  return (
    <div className="max-w-[1200px] mx-auto px-5 lg:px-8 py-6">
      <Link
        href="/app/pet-feed"
        className="inline-flex items-center gap-2 text-slate-500 text-sm hover:text-slate-900 transition-colors mb-5"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path
            d="M10 12 6 8l4-4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {t(lang, "detail.back")}
      </Link>
      <div className="mb-5">
        <DisclaimerBanner lang={lang} />
      </div>
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 lg:flex-[1.4]">
          <div className="rounded-2xl overflow-hidden bg-slate-100 aspect-[4/3] mb-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={media[activeMedia] || listing.mediaUrl}
              alt={listing.breed}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {media.slice(0, 3).map((url, i) => (
              <button
                key={`${url}-${i}`}
                type="button"
                onClick={() => setActiveMedia(i)}
                className={`rounded-xl overflow-hidden aspect-square bg-slate-100 ${
                  i === activeMedia
                    ? "ring-2 ring-[#1E6FE8]"
                    : "opacity-60 hover:opacity-100 transition-opacity"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
          {listing.evidenceUrls && listing.evidenceUrls.length > 0 && (
            <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-xs font-semibold text-amber-700 mb-2">
                {t(lang, "detail.evidence")}
              </p>
              <div className="flex gap-2">
                {listing.evidenceUrls.map((url, i) => (
                  <div
                    key={i}
                    className="w-20 h-16 rounded-lg overflow-hidden bg-amber-100"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt="Vaccine evidence"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex-1 lg:sticky lg:top-24 lg:self-start">
          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <div className="mb-4">
              <h1 className="text-xl font-bold text-slate-900 mb-1 leading-snug">
                {title}
              </h1>
              <p className="text-2xl font-bold text-[#1E6FE8]">{listing.price}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { label: t(lang, "detail.breed"), value: listing.breed },
                {
                  label: t(lang, "detail.age"),
                  value: `${listing.ageMonths} ${t(lang, "detail.months")}`,
                },
                {
                  label: t(lang, "detail.gender"),
                  value: genderLabel(lang, listing.gender),
                },
                {
                  label: t(lang, "detail.location"),
                  value: listing.location,
                },
                { label: "Vaccine", value: listing.vaccineStatus },
                {
                  label: t(lang, "detail.deworming"),
                  value: listing.dewormingStatus,
                },
              ].map((m) => (
                <div key={m.label} className="bg-slate-50 rounded-lg px-3 py-2">
                  <p className="text-[10px] text-slate-400 font-medium mb-0.5">
                    {m.label}
                  </p>
                  <p className="text-xs font-semibold text-slate-800">
                    {m.value}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 mb-5">
              {personality.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-1 bg-blue-50 text-[#1E6FE8] text-xs font-medium rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
            <p className="text-sm text-slate-600 leading-relaxed mb-5">
              {description}
            </p>
            <Link
              href={`/app/breeders/${listing.breeder.id}`}
              className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl mb-5 hover:bg-slate-100 transition-colors"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={listing.breeder.avatar}
                alt={listing.breeder.name}
                className="w-10 h-10 rounded-full object-cover"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900">
                    {listing.breeder.name}
                  </p>
                  {listing.breeder.verified && <VerifiedBadge />}
                </div>
                <p className="text-xs text-slate-400">
                  {listing.breeder.location}
                </p>
              </div>
            </Link>
            <div className="flex flex-col gap-2">
              <Link
                href="/app/messages"
                className="w-full py-3 bg-[#1E6FE8] text-white text-sm font-semibold rounded-full hover:bg-[#1D4ED8] transition-colors text-center"
              >
                💬 {t(lang, "detail.message")}
              </Link>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className="py-2.5 border border-slate-200 text-slate-700 text-sm font-medium rounded-full hover:border-slate-300 transition-colors"
                >
                  {t(lang, "detail.share")}
                </button>
                <button
                  type="button"
                  className="py-2.5 border border-slate-200 text-slate-500 text-sm font-medium rounded-full hover:border-red-200 hover:text-red-500 transition-colors"
                >
                  {t(lang, "detail.report")}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 bg-white rounded-2xl border border-slate-100 p-6">
        <h2 className="font-semibold text-slate-900 mb-5">
          {t(lang, "detail.comments")} ({comments.length})
        </h2>
        <div className="space-y-4 mb-6">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3">
              <div
                className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${
                  c.isBreeder
                    ? "bg-[#1E6FE8] text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {c.author[0]}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-xs font-semibold text-slate-900">
                    {c.author}
                  </p>
                  {c.isBreeder && <VerifiedBadge size="xs" />}
                  <p className="text-[10px] text-slate-400">{c.time}</p>
                </div>
                <p className="text-sm text-slate-600">{c.text}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <div className="w-8 h-8 rounded-full bg-[#1E6FE8] flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
            Y
          </div>
          <div className="flex-1 flex gap-2">
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") sendComment();
              }}
              placeholder={t(lang, "detail.writeComment")}
              className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#1E6FE8]/20 focus:border-[#1E6FE8] transition-all"
            />
            <button
              type="button"
              onClick={sendComment}
              className="px-4 py-2 bg-[#1E6FE8] text-white text-sm font-medium rounded-full hover:bg-[#1D4ED8] transition-colors"
            >
              {t(lang, "detail.send")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
