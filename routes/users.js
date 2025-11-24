const express = require('express');
const { ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const generateToken = require('../utils/generateToken');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

const createUserRoutes = (usersCollection) => {

  // --- PUBLIC ROUTES ---
  router.post('/register', async (req, res) => {
    const { firstName, lastName, email, password } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: 'Please provide all required fields.' });
    }
    
    try {
      const existingUser = await usersCollection.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: "User with this email already exists." });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const newUser = { firstName, lastName, email, password: hashedPassword, createdAt: new Date() };
      const result = await usersCollection.insertOne(newUser);
      
      if (result.insertedId) {
        res.status(201).json({
          _id: result.insertedId,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          email: newUser.email,
          token: generateToken(result.insertedId),
        });
      } else { 
        throw new Error('User creation failed.'); 
      }
    } catch (error) {
      console.error("Registration Error:", error);
      res.status(500).json({ message: "Server error during registration." });
    }
  });

  router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password.' });
    }

    try {
      const user = await usersCollection.findOne({ email });

      if (user && (await bcrypt.compare(password, user.password))) {
        res.status(200).json({
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          token: generateToken(user._id),
        });
      } else {
        res.status(401).json({ message: 'Invalid email or password' });
      }
    } catch (error) {
      console.error("Login Error:", error);
      res.status(500).json({ message: "Server error during login." });
    }
  });


  // --- PROTECTED ROUTES ---
  router.get('/me', protect(usersCollection), (req, res) => {
    if (req.user) {
      res.status(200).json(req.user);
    } else {
       res.status(404).json({ message: 'User not found' });
    }
  });

  return router;
};

module.exports = createUserRoutes;