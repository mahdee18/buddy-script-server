const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const { errorHandler } = require('./middleware/errorMiddleware');
const userRoutes = require('./routes/userRoutes');
// const postRoutes = require('./routes/postRoutes'); // We'll add this next

// Load env vars
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// --- Core Middleware ---
app.use(cors());
app.use(express.json()); // Replaces bodyParser.json()
app.use(express.urlencoded({ extended: false })); // Replaces bodyParser.urlencoded()


// --- API Routes ---
// The server now uses the self-contained route files.
app.use('/api/users', userRoutes);
// app.use('/api/posts', postRoutes);


// --- Base Route ---
app.get('/', (req, res) => {
  res.send('Buddy Script API is running...');
});

// --- Custom Error Handler Middleware ---
app.use(errorHandler);


// --- Start Server ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));