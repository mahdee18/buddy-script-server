// Dependencies
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');

// Import the function that creates our user routes
const createUserRoutes = require('./routes/users');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Test Route
app.get("/", (req, res) => {
  res.send("Welcome to the Buddy Script API!");
});

// DB Connection URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ftqixdj.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a new MongoClient
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Main function to connect to DB and start the server
async function startServer() {
  try {
    // 1. Connect the client to the server
    await client.connect();
    console.log("MongoDB connected successfully!");

    // 2. Get a handle on your database and the 'users' collection
    const database = client.db('buddyScriptDB'); // Replace 'buddyScriptDB' with your DB name if different
    const usersCollection = database.collection('users');

    // 3. Create the user routes by passing the collection to the factory function
    const userRoutes = createUserRoutes(usersCollection);

    // 4. Tell the app to use these routes for any path starting with /api/users
    app.use('/api/users', userRoutes);

    // 5. Start the Express server only after the database connection is established
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on http://localhost:${PORT}`);
    });

  } catch (error) {
    console.error("Failed to connect to the database or start the server.", error);
    process.exit(1); // Exit the process with an error code
  }
}

// Run the main function
startServer();