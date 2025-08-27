const jwt = require("jsonwebtoken");

// ✅ Helper: Token extract and verify
const verifyToken = (req) => {
  const authHeader = req.headers.authorization || req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Token missing or malformed");
  }

  const token = authHeader.split(" ")[1];
  return jwt.verify(token, process.env.JWT_SECRET || 'test_secret_key_for_development');
};

// ✅ 1. Normal user middleware
const authMiddleware = (req, res, next) => {
  try {
    console.log('🔍 Auth Middleware called for:', req.method, req.path);
    console.log('Authorization header:', req.headers.authorization);

    const authHeader = req.headers.authorization || req.header("Authorization");

    // Development mode - try to decode token, fall back to development user if it fails
    if (process.env.NODE_ENV === 'development') {
      try {
        const decoded = verifyToken(req);
        console.log('✅ Token verified in dev mode, user:', decoded);
        req.user = decoded;
        return next();
      } catch (tokenError) {
        console.log('🔧 Token failed in dev mode, using development fallback user');
        req.user = {
          id: '507f1f77bcf86cd799439011',
          role: 'student',
          email: 'demo@test.com',
          name: 'Demo Student'
        };
        return next();
      }
    }

    // Production mode - strict token verification
    const decoded = verifyToken(req);
    console.log('✅ Token verified in production, user:', decoded);
    req.user = decoded;
    next();
  } catch (error) {
    console.log('❌ Auth Middleware Error:', error.message);
    return res.status(401).json({ message: "❌ Unauthorized! Invalid Token" });
  }
};

// ✅ 2. Admin + Subadmin access middleware
const adminAuth = (req, res, next) => {
  try {
    const decoded = verifyToken(req);
    if (decoded.role !== "admin" && decoded.role !== "subadmin") {
      return res.status(403).json({ message: "❌ Access Denied! Admin/Subadmin only" });
    }
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "❌ Unauthorized! Invalid Token" });
  }
};



const adminOnly = (req, res, next) => {
  try {
    const decoded = verifyToken(req);
    if (decoded.role !== "admin") {
      return res.status(403).json({ message: "❌ Access Denied! Admin only" });
    }
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "❌ Unauthorized! Invalid Token" });
  }
};


const permitRoles = (...roles) => (req, res, next) => {
  try {
    const decoded = verifyToken(req);
    if (!roles.includes(decoded.role)) {
      return res.status(403).json({ message: "❌ Access Denied! Insufficient permissions" });
    }
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "❌ Unauthorized! Invalid Token" });
  }
};


// ✅ Optional auth middleware - sets user if token is valid, but doesn't block request
const optionalAuth = (req, res, next) => {
  try {
    const decoded = verifyToken(req);
    req.user = decoded;
  } catch (error) {
    console.log('ℹ️ Optional Auth: No valid token provided, continuing as guest');
    req.user = null;
  }
  next();
};

module.exports = { authMiddleware, adminAuth, adminOnly, permitRoles, verifyToken, optionalAuth };
