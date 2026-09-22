/**
 * Operator disclosure for MoIT / e-commerce registration UI.
 * Keep in sync with pet-health-web/src/lib/legalContent.ts.
 */

export const LEGAL_OPERATOR_NAME_VI = 'CÔNG TY TNHH PETHUB VIỆT NAM';
export const LEGAL_OPERATOR_NAME_EN = 'PETHUB VIET NAM COMPANY LIMITED';
export const LEGAL_OPERATOR_NAME_ABBR = 'PETHUB VN CO., LTD';
/** Enterprise registration / tax code (MST) from GCN ĐKKD. */
export const LEGAL_ENTERPRISE_CODE = '2100720164';
export const LEGAL_REGISTERED_ADDRESS_VI =
  'Thửa đất số 516, Tờ bản đồ số 4, Ấp 1, Xã Tam Ngãi, Tỉnh Vĩnh Long, Việt Nam';
export const LEGAL_REGISTERED_ADDRESS_EN =
  'Land plot No. 516, Map sheet No. 4, Hamlet 1, Tam Ngai Commune, Vinh Long Province, Vietnam';
export const LEGAL_COMPANY_PHONE = '0354311254';
export const LEGAL_SUPPORT_EMAIL = 'pethubvietnam@gmail.com';
export const LEGAL_CONTACT_EMAIL = 'pethubvietnam@gmail.com';

export function legalOperatorName(lang: string): string {
  return lang.toLowerCase().startsWith('en') ? LEGAL_OPERATOR_NAME_EN : LEGAL_OPERATOR_NAME_VI;
}

export function legalRegisteredAddress(lang: string): string {
  return lang.toLowerCase().startsWith('en') ? LEGAL_REGISTERED_ADDRESS_EN : LEGAL_REGISTERED_ADDRESS_VI;
}
