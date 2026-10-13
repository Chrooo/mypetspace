const jwt = require('jsonwebtoken');
const UserModel = require('../models/User');

// protect: the request must come with a valid token  ->  Authorization: Bearer <token>
const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Please log in to continue.' });

    const { id } = jwt.verify(token, process.env.JWT_SECRET);
    const user = await UserModel.findById(id);
    if (!user) return res.status(401).json({ message: 'Please log in again.' });

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Your session has expired. Please log in again.' });
  }
};

// authorize: only the listed roles can pass
// usage: router.get('/x', protect, authorize('admin', 'staff'), controller.fn)
const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'You do not have permission to do that.' });
  }
  next();
};

module.exports = { protect, authorize };