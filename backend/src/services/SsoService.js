const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const axios = require('axios');
require('dotenv').config();

/**
 * Tích hợp GHN SSO v2 (OpenID Connect). Toàn bộ flow chạy phía backend (client_secret không
 * bao giờ lộ ra frontend) — chỉ tắt/bật qua SSO_ENABLED, mặc định tắt cho tới khi có đủ 4 biến
 * môi trường (SSO_BASE_URL/SSO_CLIENT_ID/SSO_CLIENT_SECRET/SSO_REDIRECT_URI) từ việc đăng ký
 * app với PhatLV (3079900).
 */

const SSO_BASE_URL = (process.env.SSO_BASE_URL || '').replace(/\/$/, '');
const SSO_CLIENT_ID = process.env.SSO_CLIENT_ID || '';
const SSO_CLIENT_SECRET = process.env.SSO_CLIENT_SECRET || '';
const SSO_REDIRECT_URI = process.env.SSO_REDIRECT_URI || '';
// Ký/verify tham số `state` tự chứa (self-contained) — không cần lưu session server-side giữa
// lúc redirect ra SSO và lúc SSO gọi callback về, vì app này vốn không có session store.
const STATE_SECRET = process.env.SSO_STATE_SECRET || process.env.JWT_SECRET;

let jwks = null;
function getJwks() {
  if (!jwks) {
    jwks = jwksClient({ jwksUri: `${SSO_BASE_URL}/public-api/oauth2/jwks` });
  }
  return jwks;
}

function getSigningKey(header) {
  return new Promise((resolve, reject) => {
    getJwks().getSigningKey(header.kid, (err, key) => {
      if (err) return reject(err);
      resolve(key.getPublicKey ? key.getPublicKey() : key.publicKey || key.rsaPublicKey);
    });
  });
}

class SsoService {
  static isEnabled() {
    return (
      process.env.SSO_ENABLED === 'true' &&
      !!SSO_BASE_URL &&
      !!SSO_CLIENT_ID &&
      !!SSO_CLIENT_SECRET &&
      !!SSO_REDIRECT_URI
    );
  }

  static createAuthorizationUrl() {
    const nonce = crypto.randomBytes(16).toString('hex');
    const state = jwt.sign({ nonce }, STATE_SECRET, { expiresIn: '10m' });

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: SSO_CLIENT_ID,
      redirect_uri: SSO_REDIRECT_URI,
      scope: 'openid profile email',
      state,
      nonce,
    });

    return `${SSO_BASE_URL}/public-api/oauth2/authorize?${params.toString()}`;
  }

  /** Verify + giải mã `state` — trả về { nonce } đã ký lúc tạo authorization URL. */
  static verifyState(state) {
    try {
      return jwt.verify(state, STATE_SECRET);
    } catch {
      throw new Error('Phiên đăng nhập SSO không hợp lệ hoặc đã hết hạn, vui lòng thử lại');
    }
  }

  static async exchangeCodeForTokens(code) {
    const basicAuth = Buffer.from(`${SSO_CLIENT_ID}:${SSO_CLIENT_SECRET}`).toString('base64');
    try {
      const res = await axios.post(
        `${SSO_BASE_URL}/public-api/oauth2/token`,
        new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: SSO_REDIRECT_URI,
        }).toString(),
        {
          headers: {
            Authorization: `Basic ${basicAuth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
      return res.data;
    } catch (err) {
      throw new Error(err.response?.data?.error_description || 'Không đổi được mã xác thực SSO lấy token');
    }
  }

  /** Verify chữ ký (JWKS) + iss/aud/exp/nonce của ID token theo đúng checklist trong tài liệu. */
  static async verifyIdToken(idToken, expectedNonce) {
    const decoded = jwt.decode(idToken, { complete: true });
    if (!decoded) throw new Error('ID token SSO không hợp lệ');

    const publicKey = await getSigningKey(decoded.header);
    const claims = jwt.verify(idToken, publicKey, {
      issuer: `${SSO_BASE_URL}/public-api`,
      audience: SSO_CLIENT_ID,
      algorithms: ['RS256'],
    });

    if (claims.nonce !== expectedNonce) {
      throw new Error('Nonce của SSO không khớp — vui lòng đăng nhập lại');
    }

    return claims;
  }

  static async getUserInfo(accessToken) {
    try {
      const res = await axios.get(`${SSO_BASE_URL}/public-api/oauth2/userinfo`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return res.data;
    } catch (err) {
      throw new Error('Không lấy được thông tin người dùng từ SSO');
    }
  }
}

module.exports = SsoService;
