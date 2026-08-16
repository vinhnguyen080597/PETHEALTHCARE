"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { Lang, Listing } from "@/lib/types";
import { t } from "@/i18n";
import {
  NEWS_CATEGORY_FILTERS,
  NEWS_TOPIC_PILLS,
  filterNewsPosts,
  newsStandardPosts,
  parseNewsCategoryFilter,
  pickFeaturedNewsPost,
  pickTrendingNewsPosts,
  type NewsCategoryFilter,
} from "@/lib/newsFeed";
import { newsCategoryHref } from "@/lib/newsDetail";
import { NewsCard } from "./NewsCard";

export function NewsFeedView({
  lang,
  posts,
  isLoggedIn = false,
  initialFilter = "all",
}: {
  lang: Lang;
  posts: Listing[];
  isLoggedIn?: boolean;
  initialFilter?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category");
  const [filter, setFilter] = useState<NewsCategoryFilter>(() =>
    parseNewsCategoryFilter(initialFilter),
  );
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);

  useEffect(() => {
    setFilter(parseNewsCategoryFilter(categoryParam || initialFilter));
  }, [categoryParam, initialFilter]);

  const setFilterAndUrl = (next: NewsCategoryFilter) => {
    setFilter(next);
    router.replace(newsCategoryHref(next), { scroll: false });
  };

  const expandPostInFeed = (postId: string) => {
    setExpandedPostId(postId);
    // Wait a tick so the card mounts/expands before scrolling.
    window.requestAnimationFrame(() => {
      document
        .getElementById(`news-post-${postId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const filtered = useMemo(
    () => filterNewsPosts(posts, filter),
    [posts, filter],
  );
  const featured = useMemo(
    () => pickFeaturedNewsPost(filtered),
    [filtered],
  );
  const standard = useMemo(
    () => newsStandardPosts(filtered, featured?.id || null),
    [filtered, featured?.id],
  );
  const trending = useMemo(
    () => pickTrendingNewsPosts(posts, 3),
    [posts],
  );

  if (posts.length === 0) {
    return (
      <div className="rounded-2xl border border-[#F3E2C8] bg-white px-6 py-14 text-center">
        <p className="text-base font-semibold text-[#2B1E19]">
          {t(lang, "news.empty")}
        </p>
      </div>
    );
  }

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(240px,0.42fr)] lg:gap-8 lg:items-start">
      <div className="min-w-0 space-y-5">
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
          {NEWS_CATEGORY_FILTERS.map((item) => {
            const active = filter === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilterAndUrl(item.id)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold border transition-colors ${
                  active
                    ? "bg-[#D97706] border-[#D97706] text-white"
                    : "bg-white border-[#F3E2C8] text-[#5C4A3A] hover:bg-amber-50"
                }`}
              >
                {t(lang, item.labelKey)}
              </button>
            );
          })}
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-[#F3E2C8] bg-white px-6 py-12 text-center">
            <p className="text-sm font-semibold text-[#2B1E19]">
              {t(lang, "news.emptyFiltered")}
            </p>
          </div>
        ) : (
          <>
            {featured ? (
              <NewsCard
                lang={lang}
                post={featured}
                featured
                isLoggedIn={isLoggedIn}
                expanded={expandedPostId === featured.id}
                onExpandedChange={(on) =>
                  setExpandedPostId(on ? featured.id : null)
                }
              />
            ) : null}
            <div className="space-y-4">
              {standard.map((post) => (
                <NewsCard
                  key={post.id}
                  lang={lang}
                  post={post}
                  isLoggedIn={isLoggedIn}
                  expanded={expandedPostId === post.id}
                  onExpandedChange={(on) =>
                    setExpandedPostId(on ? post.id : null)
                  }
                />
              ))}
            </div>
          </>
        )}
      </div>

      <aside className="mt-8 lg:mt-0 space-y-4 lg:sticky lg:top-24">
        <section className="rounded-2xl border border-[#F3E2C8] bg-white p-4">
          <h3 className="text-sm font-bold text-[#2B1E19]">
            🔥 {t(lang, "news.topic.hot")}
          </h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {NEWS_TOPIC_PILLS.map((topic) => (
              <button
                key={topic.id}
                type="button"
                onClick={() => setFilterAndUrl(topic.filter)}
                className="rounded-full bg-[#FFF8EF] border border-amber-100 px-2.5 py-1 text-[11px] font-semibold text-[#B45309] hover:bg-amber-50"
              >
                {t(lang, topic.labelKey)}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-[#F3E2C8] bg-white p-4">
          <h3 className="text-sm font-bold text-[#2B1E19]">
            📈 {t(lang, "news.trending")}
          </h3>
          {trending.length === 0 ? (
            <p className="mt-3 text-xs text-stone-500">{t(lang, "news.empty")}</p>
          ) : (
            <ol className="mt-3 space-y-3">
              {trending.map((post, index) => (
                <li key={post.id} className="flex gap-3">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-amber-50 text-[#D97706] text-xs font-bold flex items-center justify-center">
                    {index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      // Ensure the post is visible under current filter.
                      const cat = parseNewsCategoryFilter(
                        post.announcementCategory,
                      );
                      if (filter !== "all" && filter !== cat) {
                        setFilterAndUrl("all");
                      }
                      expandPostInFeed(post.id);
                    }}
                    className="min-w-0 text-left text-sm font-semibold text-[#2B1E19] hover:text-[#D97706] leading-snug line-clamp-2"
                  >
                    {post.title}
                  </button>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-[#FFF8EF] p-4">
          <h3 className="text-sm font-bold text-[#2B1E19]">
            🐾 {t(lang, "news.breederCta.title")}
          </h3>
          <p className="mt-2 text-xs text-[#6E5A51] leading-relaxed">
            {t(lang, "news.breederCta.body")}
          </p>
          <Link
            href="/app/account"
            className="mt-3 inline-flex rounded-full bg-[#D97706] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#B45309]"
          >
            {t(lang, "news.breederCta.button")}
          </Link>
        </section>
      </aside>
    </div>
  );
}
