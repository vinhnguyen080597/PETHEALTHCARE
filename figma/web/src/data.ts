// ─── Types ───────────────────────────────────────────────────────────────────

export type Lang = 'VI' | 'EN'

export type View =
  | 'landing'
  | 'feed'
  | 'detail'
  | 'farm-detail'
  | 'template-picker'
  | 'farm-health'
  | 'breeder-profile-form'
  | 'admin'

export type AdminSection =
  | 'home'
  | 'requests'
  | 'listings'
  | 'breeders'
  | 'reports'
  | 'users'
  | 'features'
  | 'news'

export type TemplateId = 'T1' | 'T2' | 'T3' | 'T4' | 'T5'

export type BreederType =
  | 'registered_kennel'
  | 'home_breeder'
  | 'rescue_foster'
  | 'rehoming'
  | 'other'

export type VerificationStatus =
  | 'unverified'
  | 'pending_review'
  | 'verified'
  | 'rejected'
  | 'suspended'

export type TrustLevel = 'L0' | 'L1' | 'L2' | 'L3'

export interface Listing {
  id: string
  title: string
  titleVI: string
  species: string
  breed: string
  gender: string
  ageMonths: number
  location: string
  price: string
  description: string
  descriptionVI: string
  personality: string[]
  personalityVI: string[]
  vaccineStatus: string
  dewormingStatus: string
  mediaUrl: string
  evidenceUrls?: string[]
  status: 'published' | 'pending_review' | 'draft' | 'archived'
  breeder: BreederProfile
  saved: boolean
}

export interface BreederProfile {
  id: string
  name: string
  displayNameVI: string
  location: string
  verified: boolean
  verificationStatus: VerificationStatus
  breederType: BreederType
  primarySpecies: string[]
  mainBreeds: string[]
  avatar: string
  coverUrl?: string
  bio: string
  bioVI: string
  trustScore: number
  penaltyPoints: number
  violations: Violation[]
  activeListings: number
  template: TemplateId
  contact: {
    zalo?: string
    phone?: string
    facebook?: string
  }
  scale: string
  careEnvironment: string
  commitments: string[]
  checklist: ChecklistItem[]
}

export interface ChecklistItem {
  label: string
  done: boolean
}

export interface Violation {
  id: string
  reason: string
  date: string
  points: number
}

export interface AdminRequest {
  id: string
  type: 'breeder' | 'listing' | 'report'
  status: 'waiting' | 'approved' | 'rejected' | 'resolved' | 'dismissed'
  date: string
  title: string
  titleVI: string
  subtitle: string
  body: string
  penaltyPoints?: number
  violationCount?: number
  evidenceUrls?: string[]
  vaccineStatus?: string
  reportReason?: string
}

// ─── Sample Data ──────────────────────────────────────────────────────────────

export const sampleBreeders: BreederProfile[] = [
  {
    id: 'b1',
    name: 'Cattery Miu House',
    displayNameVI: 'Cattery Miu House',
    location: 'Quận 7, TP.HCM',
    verified: true,
    verificationStatus: 'verified',
    breederType: 'home_breeder',
    primarySpecies: ['cat'],
    mainBreeds: ['British Shorthair', 'Scottish Fold'],
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=120&h=120&fit=crop&auto=format',
    coverUrl: 'https://images.unsplash.com/photo-1533743983669-94fa5c4338ec?w=1200&h=400&fit=crop&auto=format',
    bio: 'Specialized home breeder of British Shorthair and Scottish Fold cats. Daily hygiene, indoor raised, fully vaccinated.',
    bioVI: 'Chuyên nuôi mèo Anh lông ngắn và Scottish Fold tại nhà. Vệ sinh hàng ngày, nuôi trong nhà, tiêm đầy đủ.',
    trustScore: 78,
    penaltyPoints: 0,
    violations: [],
    activeListings: 6,
    template: 'T1',
    contact: { zalo: '0901234567', phone: '0901234567', facebook: 'miuhouse' },
    scale: '4–10 bé',
    careEnvironment: 'Nuôi trong nhà, vệ sinh hàng ngày',
    commitments: ['Cung cấp thông tin trung thực', 'Hỗ trợ sau bán'],
    checklist: [
      { label: 'Tiêm phòng định kỳ', done: true },
      { label: 'Tẩy giun', done: true },
      { label: 'Vệ sinh chuồng trại', done: true },
      { label: 'Chế độ ăn phù hợp', done: true },
      { label: 'Khám thú y định kỳ', done: false },
    ],
  },
  {
    id: 'b2',
    name: 'Hanoi Golden Farm',
    displayNameVI: 'Trại Golden Hà Nội',
    location: 'Tây Hồ, Hà Nội',
    verified: true,
    verificationStatus: 'verified',
    breederType: 'registered_kennel',
    primarySpecies: ['dog'],
    mainBreeds: ['Golden Retriever', 'Labrador'],
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop&auto=format',
    coverUrl: 'https://images.unsplash.com/photo-1601979031925-424e53b6caaa?w=1200&h=400&fit=crop&auto=format',
    bio: 'Registered kennel specializing in Golden Retrievers. Professional care, FCI-standard records.',
    bioVI: 'Trại đăng ký chuyên Golden Retriever. Chăm sóc chuyên nghiệp, hồ sơ tiêu chuẩn FCI.',
    trustScore: 92,
    penaltyPoints: 0,
    violations: [],
    activeListings: 12,
    template: 'T5',
    contact: { zalo: '0912345678', phone: '0912345678', facebook: 'hanoigoldenfarm' },
    scale: '10–30 bé',
    careEnvironment: 'Chuồng rộng rãi, sân vườn, thú y theo dõi định kỳ',
    commitments: ['Hồ sơ đầy đủ', 'Trả thú nếu không phù hợp trong 7 ngày'],
    checklist: [
      { label: 'Tiêm phòng định kỳ', done: true },
      { label: 'Tẩy giun', done: true },
      { label: 'Kiểm tra ADN / pedigree', done: true },
      { label: 'Thú y theo dõi định kỳ', done: true },
      { label: 'Môi trường xã hội hóa sớm', done: true },
    ],
  },
  {
    id: 'b3',
    name: 'Saigon Fold Cattery',
    displayNameVI: 'Cattery Fold Sài Gòn',
    location: 'Bình Thạnh, TP.HCM',
    verified: false,
    verificationStatus: 'pending_review',
    breederType: 'home_breeder',
    primarySpecies: ['cat'],
    mainBreeds: ['Scottish Fold', 'Munchkin'],
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=120&h=120&fit=crop&auto=format',
    bio: 'Small home cattery focused on Scottish Fold. Pending admin verification.',
    bioVI: 'Cattery nhỏ nuôi mèo Scottish Fold tại nhà. Đang chờ admin xác minh.',
    trustScore: 42,
    penaltyPoints: 10,
    violations: [
      { id: 'v1', reason: 'Thông tin vaccine không chính xác', date: '2026-07-15', points: 10 },
    ],
    activeListings: 3,
    template: 'T3',
    contact: { zalo: '0923456789' },
    scale: '2–5 bé',
    careEnvironment: 'Nuôi trong nhà',
    commitments: ['Cung cấp thông tin trung thực'],
    checklist: [
      { label: 'Tiêm phòng định kỳ', done: true },
      { label: 'Tẩy giun', done: false },
      { label: 'Vệ sinh chuồng trại', done: true },
      { label: 'Thú y theo dõi', done: false },
    ],
  },
  {
    id: 'b4',
    name: 'Rescue Paws HCM',
    displayNameVI: 'Cứu hộ Paws TP.HCM',
    location: 'Gò Vấp, TP.HCM',
    verified: true,
    verificationStatus: 'verified',
    breederType: 'rescue_foster',
    primarySpecies: ['cat', 'dog'],
    mainBreeds: ['Mixed breed', 'Corgi mix'],
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&h=120&fit=crop&auto=format',
    coverUrl: 'https://images.unsplash.com/photo-1558788353-f76d92427f16?w=1200&h=400&fit=crop&auto=format',
    bio: 'Non-profit rescue and foster network. All pets fully vetted before rehoming.',
    bioVI: 'Mạng lưới cứu hộ và foster phi lợi nhuận. Mọi bé được kiểm tra kỹ trước khi tìm nhà mới.',
    trustScore: 85,
    penaltyPoints: 0,
    violations: [],
    activeListings: 9,
    template: 'T4',
    contact: { facebook: 'rescuepawshcm', phone: '0934567890' },
    scale: 'Linh hoạt',
    careEnvironment: 'Foster homes network, vet-checked',
    commitments: ['Kiểm tra gia đình nhận nuôi', 'Theo dõi sau nhận nuôi 30 ngày'],
    checklist: [
      { label: 'Khám sức khỏe đầu vào', done: true },
      { label: 'Tiêm phòng', done: true },
      { label: 'Tẩy giun / ký sinh trùng', done: true },
      { label: 'Chíp điện tử', done: false },
    ],
  },
]

export const sampleListings: Listing[] = [
  {
    id: '1',
    title: 'British Shorthair Blue – Male 3 months',
    titleVI: 'Mèo Anh lông ngắn xám xanh – Đực 3 tháng',
    species: 'cat',
    breed: 'British Shorthair',
    gender: 'male',
    ageMonths: 3,
    location: 'Quận 7, TP.HCM',
    price: '8.500.000 ₫',
    description: 'Healthy kitten, 2 FVRCP shots done. Calm indoor temperament.',
    descriptionVI: 'Bé đã tiêm 2 mũi FVRCP, nuôi trong nhà, hiền và bám người.',
    personality: ['Gentle', 'Playful', 'Cuddly'],
    personalityVI: ['Hiền lành', 'Ham chơi', 'Thích ôm'],
    vaccineStatus: 'FVRCP ×2',
    dewormingStatus: 'Done',
    evidenceUrls: [
      'https://images.unsplash.com/photo-1526341163067-8a2f5a28a2b2?w=400&h=300&fit=crop&auto=format',
    ],
    mediaUrl: 'https://images.unsplash.com/photo-1533743983669-94fa5c4338ec?w=800&h=600&fit=crop&auto=format',
    status: 'published',
    breeder: sampleBreeders[0],
    saved: false,
  },
  {
    id: '2',
    title: 'Golden Retriever – Female 2 months',
    titleVI: 'Chó Golden Retriever – Cái 2 tháng',
    species: 'dog',
    breed: 'Golden Retriever',
    gender: 'female',
    ageMonths: 2,
    location: 'Tây Hồ, Hà Nội',
    price: '12.000.000 ₫',
    description: 'Playful, family-raised. 1st vaccination complete.',
    descriptionVI: 'Nuôi trong gia đình, tiêm mũi 1, vui vẻ năng động.',
    personality: ['Energetic', 'Friendly', 'Smart'],
    personalityVI: ['Năng động', 'Thân thiện', 'Thông minh'],
    vaccineStatus: 'Combo ×1',
    dewormingStatus: 'Done',
    mediaUrl: 'https://images.unsplash.com/photo-1601979031925-424e53b6caaa?w=800&h=600&fit=crop&auto=format',
    status: 'pending_review',
    breeder: sampleBreeders[1],
    saved: true,
  },
  {
    id: '3',
    title: 'Scottish Fold – Male 4 months',
    titleVI: 'Mèo Scottish Fold – Đực 4 tháng',
    species: 'cat',
    breed: 'Scottish Fold',
    gender: 'male',
    ageMonths: 4,
    location: 'Bình Thạnh, TP.HCM',
    price: '6.800.000 ₫',
    description: 'Folded ears, well socialized. Vet health check included.',
    descriptionVI: 'Tai cụp đẹp, đã kiểm tra sức khỏe tại phòng khám.',
    personality: ['Calm', 'Curious'],
    personalityVI: ['Điềm tĩnh', 'Tò mò'],
    vaccineStatus: 'FVRCP ×2',
    dewormingStatus: 'Done',
    mediaUrl: 'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=800&h=600&fit=crop&auto=format',
    status: 'pending_review',
    breeder: sampleBreeders[2],
    saved: false,
  },
  {
    id: '4',
    title: 'Poodle Toy – Female 3 months',
    titleVI: 'Chó Poodle Toy – Cái 3 tháng',
    species: 'dog',
    breed: 'Poodle',
    gender: 'female',
    ageMonths: 3,
    location: 'Cầu Giấy, Hà Nội',
    price: '9.200.000 ₫',
    description: 'Hypoallergenic, well-groomed, very affectionate.',
    descriptionVI: 'Không rụng lông, đã tỉa lông định kỳ, bám người.',
    personality: ['Affectionate', 'Active'],
    personalityVI: ['Tình cảm', 'Hiếu động'],
    vaccineStatus: 'Combo ×2',
    dewormingStatus: 'Done',
    mediaUrl: 'https://images.unsplash.com/photo-1571160220144-c5a07f5e6c64?w=800&h=600&fit=crop&auto=format',
    status: 'published',
    breeder: sampleBreeders[1],
    saved: false,
  },
  {
    id: '5',
    title: 'Persian Cat – Female 5 months',
    titleVI: 'Mèo Ba Tư – Cái 5 tháng',
    species: 'cat',
    breed: 'Persian',
    gender: 'female',
    ageMonths: 5,
    location: 'Đà Nẵng',
    price: '7.500.000 ₫',
    description: 'Long coat, gentle demeanor. Groomed regularly.',
    descriptionVI: 'Lông dài mượt, hiền lành, vệ sinh tai định kỳ.',
    personality: ['Gentle', 'Quiet'],
    personalityVI: ['Hiền', 'Yên tĩnh'],
    vaccineStatus: 'FVRCP ×3',
    dewormingStatus: 'Done',
    mediaUrl: 'https://images.unsplash.com/photo-1561948955-570b270e7c36?w=800&h=600&fit=crop&auto=format',
    status: 'published',
    breeder: sampleBreeders[0],
    saved: false,
  },
  {
    id: '6',
    title: 'Corgi Pembroke – Male 3 months',
    titleVI: 'Chó Corgi Pembroke – Đực 3 tháng',
    species: 'dog',
    breed: 'Corgi',
    gender: 'male',
    ageMonths: 3,
    location: 'Quận 1, TP.HCM',
    price: '18.000.000 ₫',
    description: 'Classic tricolor, paperwork included. Very social.',
    descriptionVI: 'Màu tricolor đẹp, có sổ tiêm. Hoà đồng cao.',
    personality: ['Social', 'Playful', 'Alert'],
    personalityVI: ['Xã hội', 'Vui vẻ', 'Nhạy bén'],
    vaccineStatus: 'Combo ×2',
    dewormingStatus: 'Done',
    mediaUrl: 'https://images.unsplash.com/photo-1558788353-f76d92427f16?w=800&h=600&fit=crop&auto=format',
    status: 'published',
    breeder: sampleBreeders[3],
    saved: false,
  },
]

export const sampleAdminRequests: AdminRequest[] = [
  {
    id: 'r1',
    type: 'breeder',
    status: 'waiting',
    date: '2026-08-01',
    title: 'Saigon Fold Cattery',
    titleVI: 'Saigon Fold Cattery',
    subtitle: 'home_breeder · TP.HCM · cat',
    body: 'Bio, checklist partial. 3 active listings. Pending verification.',
    penaltyPoints: 0,
    violationCount: 0,
  },
  {
    id: 'r2',
    type: 'listing',
    status: 'waiting',
    date: '2026-08-01',
    title: 'Scottish Fold – Male 4 months',
    titleVI: 'Mèo Scottish Fold – Đực 4 tháng',
    subtitle: 'Saigon Fold Cattery · 6.800.000 ₫',
    body: 'Vaccine: FVRCP ×2. Evidence: 1 photo attached.',
    vaccineStatus: 'FVRCP ×2',
    evidenceUrls: ['https://images.unsplash.com/photo-1526341163067-8a2f5a28a2b2?w=400&h=300&fit=crop&auto=format'],
  },
  {
    id: 'r3',
    type: 'report',
    status: 'waiting',
    date: '2026-07-30',
    title: 'Báo cáo: Thông tin sai lệch',
    titleVI: 'Báo cáo: Thông tin sai lệch',
    subtitle: 'Listing: Scottish Fold – Male 4m · Người báo: user_abc',
    body: 'Người dùng báo cáo thông tin vaccine không khớp với bằng chứng ảnh.',
    reportReason: 'misleading_health_claims',
  },
  {
    id: 'r4',
    type: 'breeder',
    status: 'waiting',
    date: '2026-07-29',
    title: 'Da Nang Persian House',
    titleVI: 'Da Nang Persian House',
    subtitle: 'home_breeder · Đà Nẵng · cat',
    body: 'Đăng ký mới. Bio đầy đủ. 2 tin đang đăng.',
    penaltyPoints: 0,
    violationCount: 0,
  },
  {
    id: 'r5',
    type: 'listing',
    status: 'approved',
    date: '2026-07-28',
    title: 'British Shorthair Blue – Male',
    titleVI: 'Mèo Anh lông ngắn xám xanh – Đực',
    subtitle: 'Cattery Miu House · 8.500.000 ₫',
    body: 'Vaccine evidence present. Approved.',
    vaccineStatus: 'FVRCP ×2',
    evidenceUrls: ['https://images.unsplash.com/photo-1526341163067-8a2f5a28a2b2?w=400&h=300&fit=crop&auto=format'],
  },
  {
    id: 'r6',
    type: 'report',
    status: 'resolved',
    date: '2026-07-25',
    title: 'Báo cáo: Nội dung spam',
    titleVI: 'Báo cáo: Nội dung spam',
    subtitle: 'Listing: Mixed breed puppies · User: user_xyz',
    body: 'Đã xác nhận vi phạm. −10 điểm Farm Health.',
    reportReason: 'spam',
  },
]

export const featureFlags = [
  { key: 'pet_feed_listings', label: 'Tab: Tin mới (New Pets)', enabled: true, scope: 'web+mobile' },
  { key: 'pet_feed_news', label: 'Tab: Tin tức (News)', enabled: true, scope: 'web+mobile' },
  { key: 'pet_feed_breeders', label: 'Tab: Breeders', enabled: true, scope: 'web+mobile' },
  { key: 'health_analysis', label: 'AI Health Analysis', enabled: false, scope: 'mobile-only' },
  { key: 'breed_recognition', label: 'Breed Recognition', enabled: false, scope: 'mobile-only' },
  { key: 'rewarded_ads', label: 'Rewarded Ads', enabled: false, scope: 'mobile-only' },
  { key: 'subscription', label: 'Subscription / PetCoin', enabled: false, scope: 'mobile-only' },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getTrustLevel(score: number, verified: boolean): { level: 'L0' | 'L1' | 'L2' | 'L3'; label: string } {
  if (!verified || score < 40) return { level: 'L0', label: 'Mới bắt đầu' }
  if (score < 70) return { level: 'L1', label: 'Đang xây dựng' }
  if (score < 90) return { level: 'L2', label: 'Đáng tin cậy' }
  return { level: 'L3', label: 'Đối tác nổi bật' }
}

export function getEffectiveTrust(score: number, penalty: number): number {
  return Math.max(0, score - penalty)
}

export const templateMeta: Record<string, { nameVI: string; nameEN: string; accent: string; description: string }> = {
  T1: { nameVI: 'Tối giản tin cậy', nameEN: 'Trust Minimal', accent: '#1E6FE8', description: 'Hero compact gradient/primary. Metric + Trust nổi bật. Phù hợp hộ gia đình, lần đầu đăng ký.' },
  T2: { nameVI: 'Trại có ảnh bìa', nameEN: 'Cover Farm', accent: '#0F172A', description: 'Cover full-bleed. Story 2-col. Phù hợp kennel có ảnh môi trường đẹp.' },
  T3: { nameVI: 'Ưu tiên tin đăng', nameEN: 'Listings First', accent: '#7C3AED', description: 'Metric mỏng → Listings grid ngay. Accent tím. Phù hợp breeder nhiều tin.' },
  T4: { nameVI: 'Cứu hộ / Foster', nameEN: 'Rescue Soft', accent: '#059669', description: 'Story + commitments nổi. Spacing thoáng. Phù hợp rescue, foster, rehoming.' },
  T5: { nameVI: 'Kennel đăng ký', nameEN: 'Registered Kennel', accent: '#B45309', description: 'Banner credentials. Trust + Verified nhấn mạnh. Phù hợp trại đăng ký chính thức.' },
}
