require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const UserModel = require('./models/User');

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000' }));
app.use(express.json());

// test page: open http://localhost:8000 in the browser
app.get('/', (req, res) => res.send('My Pet Space server is running'));

// connect to MongoDB (the link comes from MONGO_URI in server/.env)
mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('MongoDB connected');

    // first run only: create the Admin account from .env so you can log in
    const hasAdmin = await UserModel.exists({ role: 'admin' });
    if (hasAdmin) {
      console.log('Admin account already exists');
    } else if (!process.env.ADMIN_IDENTIFIER || !process.env.ADMIN_PASSWORD) {
      console.log('Admin NOT created: ADMIN_IDENTIFIER or ADMIN_PASSWORD is missing in server/.env');
    } else {
      await UserModel.create({
        firstName: process.env.ADMIN_FIRST_NAME || 'Admin', lastName: process.env.ADMIN_LAST_NAME || 'User',
        identifier: process.env.ADMIN_IDENTIFIER.toLowerCase(),
        password: process.env.ADMIN_PASSWORD,
        role: 'admin',
      });
      console.log('Admin account created');
    }
  })
  .catch((err) => console.log(err));

// all endpoints start with /api  (e.g. http://localhost:8000/api/login)
app.use('/api', authRoutes);

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server is Running at http://localhost:${PORT}`);
});