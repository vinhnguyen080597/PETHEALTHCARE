/** 34 đơn vị hành chính cấp tỉnh Việt Nam (Nghị quyết 202/2025, hiệu lực từ 12/6/2025). */
export const VIETNAM_PROVINCES = [
  'An Giang',
  'Bắc Ninh',
  'Cà Mau',
  'Cao Bằng',
  'TP. Cần Thơ',
  'TP. Đà Nẵng',
  'Đắk Lắk',
  'Điện Biên',
  'TP. Đồng Nai',
  'Đồng Tháp',
  'Gia Lai',
  'TP. Hà Nội',
  'Hà Tĩnh',
  'TP. Hải Phòng',
  'TP. Huế',
  'Hưng Yên',
  'Khánh Hòa',
  'Lai Châu',
  'Lạng Sơn',
  'Lào Cai',
  'Lâm Đồng',
  'Nghệ An',
  'Ninh Bình',
  'Phú Thọ',
  'Quảng Ngãi',
  'Quảng Ninh',
  'Quảng Trị',
  'Sơn La',
  'Tây Ninh',
  'Thái Nguyên',
  'Thanh Hóa',
  'TP. Hồ Chí Minh',
  'Tuyên Quang',
  'Vĩnh Long',
] as const;

export type VietnamProvince = (typeof VIETNAM_PROVINCES)[number];

export const ALL_PROVINCES_FILTER = 'all' as const;

export type ProvinceFilter = typeof ALL_PROVINCES_FILTER | VietnamProvince;
