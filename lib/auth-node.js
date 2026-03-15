// Node.js only - used in API routes (not middleware/edge)
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'wh4ts4pp_s3cr3t';

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

module.exports = { signToken, verifyToken };
