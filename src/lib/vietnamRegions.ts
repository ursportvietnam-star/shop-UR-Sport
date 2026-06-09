import { VIETNAM_WARDS_BY_PROVINCE_2025 } from '@/data/vietnamWards2025';

export interface ProvinceOption {
  code: string;
  name: string;
  type?: string;
}

export interface WardOption {
  code: string;
  name: string;
  province_code: string;
  district_code?: string;
}

export const VIETNAM_PROVINCES_2025: ProvinceOption[] = [
  { code: '01', name: 'Thành phố Hà Nội', type: 'Thành phố Trung ương' },
  { code: '79', name: 'Thành phố Hồ Chí Minh', type: 'Thành phố Trung ương' },
  { code: '89', name: 'Tỉnh An Giang', type: 'Tỉnh' },
  { code: '24', name: 'Tỉnh Bắc Ninh', type: 'Tỉnh' },
  { code: '96', name: 'Tỉnh Cà Mau', type: 'Tỉnh' },
  { code: '92', name: 'Thành phố Cần Thơ', type: 'Thành phố Trung ương' },
  { code: '04', name: 'Tỉnh Cao Bằng', type: 'Tỉnh' },
  { code: '48', name: 'Thành phố Đà Nẵng', type: 'Thành phố Trung ương' },
  { code: '66', name: 'Tỉnh Đắk Lắk', type: 'Tỉnh' },
  { code: '11', name: 'Tỉnh Điện Biên', type: 'Tỉnh' },
  { code: '75', name: 'Tỉnh Đồng Nai', type: 'Tỉnh' },
  { code: '87', name: 'Tỉnh Đồng Tháp', type: 'Tỉnh' },
  { code: '64', name: 'Tỉnh Gia Lai', type: 'Tỉnh' },
  { code: '42', name: 'Tỉnh Hà Tĩnh', type: 'Tỉnh' },
  { code: '31', name: 'Thành phố Hải Phòng', type: 'Thành phố Trung ương' },
  { code: '46', name: 'Thành phố Huế', type: 'Thành phố Trung ương' },
  { code: '33', name: 'Tỉnh Hưng Yên', type: 'Tỉnh' },
  { code: '56', name: 'Tỉnh Khánh Hòa', type: 'Tỉnh' },
  { code: '12', name: 'Tỉnh Lai Châu', type: 'Tỉnh' },
  { code: '68', name: 'Tỉnh Lâm Đồng', type: 'Tỉnh' },
  { code: '20', name: 'Tỉnh Lạng Sơn', type: 'Tỉnh' },
  { code: '10', name: 'Tỉnh Lào Cai', type: 'Tỉnh' },
  { code: '40', name: 'Tỉnh Nghệ An', type: 'Tỉnh' },
  { code: '37', name: 'Tỉnh Ninh Bình', type: 'Tỉnh' },
  { code: '25', name: 'Tỉnh Phú Thọ', type: 'Tỉnh' },
  { code: '51', name: 'Tỉnh Quảng Ngãi', type: 'Tỉnh' },
  { code: '22', name: 'Tỉnh Quảng Ninh', type: 'Tỉnh' },
  { code: '44', name: 'Tỉnh Quảng Trị', type: 'Tỉnh' },
  { code: '14', name: 'Tỉnh Sơn La', type: 'Tỉnh' },
  { code: '80', name: 'Tỉnh Tây Ninh', type: 'Tỉnh' },
  { code: '19', name: 'Tỉnh Thái Nguyên', type: 'Tỉnh' },
  { code: '38', name: 'Tỉnh Thanh Hóa', type: 'Tỉnh' },
  { code: '08', name: 'Tỉnh Tuyên Quang', type: 'Tỉnh' },
  { code: '86', name: 'Tỉnh Vĩnh Long', type: 'Tỉnh' },
];

export const fetchVietnamProvinces = async () => {
  return [...VIETNAM_PROVINCES_2025].sort((a, b) => a.name.localeCompare(b.name, 'vi'));
};

export const fetchVietnamWards = async (provinceCode: string) => {
  if (!provinceCode) return [];
  return (VIETNAM_WARDS_BY_PROVINCE_2025[provinceCode] || []).map((name, index) => ({
    code: `${provinceCode}-${index + 1}`,
    name,
    province_code: provinceCode
  }));
};

export const composeVietnamAddress = (addressDetail: string, wardName: string, provinceName: string) => {
  return [addressDetail.trim(), wardName.trim(), provinceName.trim()].filter(Boolean).join(', ');
};
