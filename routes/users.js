const express = require('express');
const { ObjectId } = require('mongodb');
const router = express.Router();


router.post('/login', async (req, res) => {
  const db = req.app.locals.db;
  const { email, password } = req.body;
  
  console.log(`Login attempt for email: ${email}`); });

// Register a new user 
router.post('/register', async (req, res) => {
  const db = req.app.locals.db;
  const usersCollection = db.collection('users');
  const user = req.body;

  // 1. Find duplicate email
  const query = { email: user.email };
  const existingUser = await usersCollection.findOne(query);

  if (existingUser) {
    return res.status(400).send({ message: "User with this email already exists." });
  }
  
  const result = await usersCollection.insertOne({
      ...user,
      createdAt: new Date()
  });

  res.status(201).send(result);
});

router.post('/login', async (req, res) => {
    const db = req.app.locals.db;
    const usersCollection = db.collection('users');
    const { email, password } = req.body;

    const query = { email: email };
    const user = await usersCollection.findOne(query);

    if (!user) {
        return res.status(404).send({ message: "User not found." });
    }

    if (user.password !== password) {
        return res.status(401).send({ message: "Incorrect password." });
    }

    const { password: userPassword, ...userWithoutPassword } = user;
    res.status(200).send(userWithoutPassword);
});


router.get('/', async (req, res) => {
    const db = req.app.locals.db;
    const usersCollection = db.collection('users');

    const result = await usersCollection.find().toArray();
    res.send(result);
});


router.get('/:id', async (req, res) => {
    const db = req.app.locals.db;
    const usersCollection = db.collection('users');
    const id = req.params.id;

    if (!ObjectId.isValid(id)) {
        return res.status(400).send({ message: 'Invalid user ID format.' });
    }

    const query = { _id: new ObjectId(id) };
    const result = await usersCollection.findOne(query);

    if (!result) {
        return res.status(404).send({ message: 'User not found.' });
    }
    
    res.send(result);
});


module.exports = router;