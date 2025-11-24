const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');

// This function protects routes by verifying a user's JWT token
const protect = (usersCollection) => async (req, res, next) => {
  let token;

  // Check if the request has an Authorization header that starts with "Bearer"
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header (e.g., "Bearer <token>" -> "<token>")
      token = req.headers.authorization.split(' ')[1];

      // Verify the token using your JWT_SECRET
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Find the user by the ID stored in the token and attach them to the request
      // Exclude the password field for security
      req.user = await usersCollection.findOne(
        { _id: new ObjectId(decoded.id) },
        { projection: { password: 0 } }
      );

      if (!req.user) {
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }

      next(); // Proceed to the next middleware or the route handler

    } catch (error) {
      console.error('Token verification failed:', error);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

module.exports = { protect };