const mongoose = require('mongoose');
const express = require('express');

// Let's connect to the DB and check the user documents
mongoose.connect('mongodb://localhost:27017/shaturajones').then(async () => {
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  const users = await User.find({}).limit(1);
  console.log(users);
  mongoose.disconnect();
}).catch(console.error);
