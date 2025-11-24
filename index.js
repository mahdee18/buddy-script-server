const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const bodyParser = require('body-parser'); 
const { MongoClient, ServerApiVersion } = require('mongodb');
const path = require('path');

const createUserRoutes = require('./routes/users');
const createPostRoutes = require('./routes/posts');

dotenv.config();
const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log('--- New Request ---');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Method:', req.method);
  console.log('URL:', req.originalUrl);
  console.log('Request Body:', req.body); 
  console.log('-------------------');
  next(); 
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ftqixdj.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, {
  serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
});

async function startServer() {
  try {
    await client.connect();
    const database = client.db('buddyScriptDB');
    console.log("MongoDB connected successfully!");

    const usersCollection = database.collection('users');
    const postsCollection = database.collection('posts');

    // --- API ROUTES ---
    const userRoutes = createUserRoutes(usersCollection);
    const postRoutes = createPostRoutes(postsCollection, usersCollection);

    app.use('/api/users', userRoutes);
    app.use('/api/posts', postRoutes);

    app.get("/", (req, res) => {
      res.send("Welcome to the Buddy Script API!");
    });
    
    // --- START LISTENING ---
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });

  } catch (error) {
    console.error("Failed to connect to the database or start the server.", error);
    process.exit(1);
  }
}

startServer();