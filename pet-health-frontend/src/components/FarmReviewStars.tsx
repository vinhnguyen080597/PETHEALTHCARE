import { Text, View } from 'react-native';
import { farmReviewStarCount } from '../utils/farmReview';

type FarmReviewStarsProps = {
  rating: number;
  size?: number;
};

const STAR_FILLED = '#FBBF24';
const STAR_EMPTY = '#CBD5E1';

export function FarmReviewStars({ rating, size = 14 }: FarmReviewStarsProps) {
  const filled = farmReviewStarCount(rating);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 1 }}>
      {Array.from({ length: 5 }, (_, index) => (
        <Text
          key={index}
          style={{
            fontSize: size,
            lineHeight: size + 2,
            color: index < filled ? STAR_FILLED : STAR_EMPTY,
          }}
        >
          ★
        </Text>
      ))}
    </View>
  );
}
