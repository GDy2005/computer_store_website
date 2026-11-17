function immutableAddress(value) {
  return Object.freeze({...value});
}

// Canonical two-level addresses used by deterministic seeds and integration
// tests. Names and codes match the post-reorganisation administrative dataset
// bundled with the storefront.
export const VIETNAM_DEMO_ADDRESSES = Object.freeze({
  BEN_THANH: immutableAddress({
    addressLine: '4 Lê Lợi',
    ward: 'Phường Bến Thành',
    wardCode: '26743',
    province: 'Thành phố Hồ Chí Minh',
    provinceCode: '79'
  }),
  CHO_QUAN: immutableAddress({
    addressLine: '63/52 Nguyễn Biểu',
    ward: 'Phường Chợ Quán',
    wardCode: '27301',
    province: 'Thành phố Hồ Chí Minh',
    provinceCode: '79'
  }),
  TAN_HUNG: immutableAddress({
    addressLine: '19 Nguyễn Hữu Thọ',
    ward: 'Phường Tân Hưng',
    wardCode: '27475',
    province: 'Thành phố Hồ Chí Minh',
    provinceCode: '79'
  }),
  TAN_MY: immutableAddress({
    addressLine: '10 Nguyễn Văn Linh',
    ward: 'Phường Tân Mỹ',
    wardCode: '27487',
    province: 'Thành phố Hồ Chí Minh',
    provinceCode: '79'
  })
});
