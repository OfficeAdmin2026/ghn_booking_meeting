const COMPANY_DOMAINS = ['@ghn.vn', '@giaohangnhanh.vn'];

function isCompanyEmail(email) {
  if (!email) return false;
  const lower = String(email).trim().toLowerCase();
  return COMPANY_DOMAINS.some((d) => lower.endsWith(d));
}

module.exports = { isCompanyEmail, COMPANY_DOMAINS };
