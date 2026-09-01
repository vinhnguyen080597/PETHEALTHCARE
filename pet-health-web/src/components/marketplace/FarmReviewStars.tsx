import { normalizeFarmReviewRating } from "@/lib/breederFarmReviews";

type FarmReviewStarsProps = {
  rating: number;
  className?: string;
};

export function FarmReviewStars({ rating, className = "" }: FarmReviewStarsProps) {
  const filled = normalizeFarmReviewRating(rating);
  return (
    <span
      className={`inline-flex items-center gap-0.5 ${className}`}
      aria-label={`${filled}/5`}
    >
      {Array.from({ length: 5 }, (_, index) => (
        <span
          key={index}
          className={index < filled ? "text-amber-400" : "text-slate-300"}
          aria-hidden
        >
          ★
        </span>
      ))}
    </span>
  );
}
