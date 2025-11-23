const express = require("express");
const router = express.Router();
const { mongoClient, usersCollection } = require("../index");
const { ObjectId } = require("mongodb");

// users
router.get("/users", async (req, res) => {
  const result = await usersCollection.find().toArray();
  res.send(result);
});


router.get("/users/:id", async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) }
  const result = await usersCollection.findOne(query)
  res.send(result);
});

router.delete("/users/:id", async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) }
  const result = await usersCollection.deleteOne(query)
  res.send(result)
});

router.post("/addUser", async (req, res) => {
  const user = req.body;
  const query = { email: user.email };
  const existingUser = await usersCollection.findOne(query);
  if (existingUser) {
    return res.send({ message: "user already exits" });
  }
  const result = await usersCollection.insertOne(user);
  res.send(result);
});




module.exports = router;
