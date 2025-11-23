// Dependencies
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');


const userRoutes = require('./routes/users'); 

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// --- ROUTES ---
app.use('/api/users', userRoutes);

// Test Route
app.get("/", (req, res) => {
  res.send("Welcome to the Buddy Script API!");
});

// DB Connection URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ftqixdj.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

let client;

async function connectDB() {
  try {
    client = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    });

    // await client.connect();

    app.locals.db = client.db('buddyScriptDB'); 

    console.log("MongoDB connected successfully!");

  } catch (error)
   {
    console.error("MongoDB connection failed:", error);
    process.exit(1);
  }
}

connectDB().then(() => {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
  });
});