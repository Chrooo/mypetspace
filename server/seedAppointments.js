// Adds sample grooming appointments to the FIRST groomer account, so you can try the Groomer Dashboard
// before the booking step exists.   Run once from this folder:   node seedAppointments.js
require('dotenv').config();
const mongoose = require('mongoose');
const UserModel = require('./models/User');
const PetModel = require('./models/Pet');
const Appointment = require('./models/Appointment');

const SAMPLE = [
  ['Full Groom', 'pending'],
  ['Basic Groom', 'confirmed'],
  ['Bath-Dry, Nail Trimming', 'in_progress'],
  ['Groom & Massage', 'completed'],
  ['Full Groom', 'cancelled'],
  ['Dematting', 'pending'],
  ['Ear Cleaning, Eye Cleaning', 'confirmed'],
  ['Basic Groom', 'pending'],
  ['Full Groom', 'completed'],
  ['Tear Strain', 'pending'],
  ['Bath-Dry', 'confirmed'],
  ['Groom & Massage', 'pending'],
];

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const groomer = await UserModel.findOne({ role: 'groomer' });
  if (!groomer) {
    console.log('No groomer account yet. Log in as admin, create one on the Register page, then run this again.');
    return;
  }

  // a demo Fur Parent and pet to attach the appointments to
  let owner = await UserModel.findOne({ identifier: 'demo.customer@mypetspace.com' });
  if (!owner) {
    owner = await UserModel.create({
      firstName: 'Dog',
      lastName: 'Lover',
      identifier: 'demo.customer@mypetspace.com',
      password: 'Demo12345',
      role: 'customer',
    });
  }
  let pet = await PetModel.findOne({ owner: owner._id });
  if (!pet) {
    pet = await PetModel.create({
      owner: owner._id, name: 'Biscuit', type: 'Dog', breed: 'Shih Tzu', age: 3, gender: 'Male',
      notes: 'Allergic to strongly scented shampoo.',
    });
  }

  const day = 24 * 60 * 60 * 1000;
  const rows = SAMPLE.map(([services, status], i) => ({
    customer: owner._id,
    customerName: owner.fullName,
    pet: pet._id,
    petName: pet.name,
    petType: pet.type,
    petBreed: pet.breed,
    petAge: pet.age,
    petGender: pet.gender,
    petNotes: pet.notes,
    services: services.split(', '),
    groomer: groomer._id,
    scheduledAt: new Date(Date.now() + (i - 5) * day),
    status,
  }));
  await Appointment.insertMany(rows);
  console.log(`Added ${rows.length} sample appointments for ${groomer.fullName}.`);
})()
  .catch((err) => console.error(err))
  .finally(() => mongoose.disconnect());