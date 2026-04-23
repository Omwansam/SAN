const crypto = require('crypto');

function createOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function hashOtp(code) {
  return crypto.createHash('sha256').update(String(code)).digest('hex');
}

module.exports = {
  createOtpCode,
  hashOtp,
};

