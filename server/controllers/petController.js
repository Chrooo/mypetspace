const mongoose = require('mongoose');
const PetModel = require('../models/Pet');
const { logAction } = require('../utils/audit');

const PET_NAME_RE = /^[A-Za-z0-9\u00C0-\u024F][A-Za-z0-9\u00C0-\u024F .'-]*$/;
const BREED_RE = /^[A-Za-z\u00C0-\u024F][A-Za-z\u00C0-\u024F .'/()-]*$/;
const PHOTO_RE = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;
const MAX_PHOTO_CHARS = 300000; // about 220 KB of image
const MAX_PETS_PER_OWNER = 20;
const TYPES = ['Dog', 'Cat'];
const GENDERS = ['Male', 'Female'];

// checks the pet details sent from the sign-up form / My Pets form
// returns { error } or { pet: cleanValues }
// photo: left out = not sent (keep the old one), '' = remove it, otherwise a small image data URL
const cleanPet = (input) => {
  const pet = input && typeof input === 'object' ? input : {};
  const name = String(pet.name ?? '').trim();
  const breed = String(pet.breed ?? '').trim();
  const notes = String(pet.notes ?? '').trim();
  const age = Number(pet.age);

  if (!name) return { error: 'Pet name is required.' };
  if (name.length > 50 || !PET_NAME_RE.test(name)) {
    return { error: 'Pet name can only have letters, numbers, spaces, apostrophes, periods and hyphens (50 characters max).' };
  }
  if (!breed) return { error: 'Pet breed is required.' };
  if (breed.length > 50 || !BREED_RE.test(breed)) {
    return { error: 'Breed can only have letters, spaces and basic punctuation (50 characters max).' };
  }
  if (pet.age === undefined || pet.age === null || String(pet.age).trim() === '' || !Number.isFinite(age) || age < 0 || age > 40) {
    return { error: 'Pet age must be a number from 0 to 40 (in years).' };
  }
  if (!GENDERS.includes(pet.gender)) return { error: 'Choose your pet\'s gender.' };
  if (!TYPES.includes(pet.type)) return { error: 'Choose your pet\'s type (Dog or Cat).' };
  if (notes.length > 300) return { error: 'Additional notes can be 300 characters at most.' };

  const clean = { name, breed, age, gender: pet.gender, type: pet.type, notes };

  if (pet.photo !== undefined && pet.photo !== null) {
    const photo = String(pet.photo);
    if (photo && (!PHOTO_RE.test(photo) || photo.length > MAX_PHOTO_CHARS)) {
      return { error: 'Photo must be a PNG, JPG or WEBP image under 200 KB.' };
    }
    clean.photo = photo;
  }

  return { pet: clean };
};

const serverError = (res, err) => {
  console.error(err);
  res.status(500).json({ message: 'Internal Server Error' });
};

// GET /api/pets  (any logged-in user) - only the pets that belong to you, newest first
const listMyPets = async (req, res) => {
  try {
    const pets = await PetModel.find({ owner: req.user._id }).sort({ createdAt: -1 });
    res.json({ pets });
  } catch (err) {
    serverError(res, err);
  }
};

// POST /api/pets  - add another pet to your account
const createPet = async (req, res) => {
  try {
    const result = cleanPet(req.body);
    if (result.error) return res.status(400).json({ message: result.error });

    if ((await PetModel.countDocuments({ owner: req.user._id })) >= MAX_PETS_PER_OWNER) {
      return res.status(400).json({ message: `You can register up to ${MAX_PETS_PER_OWNER} pets.` });
    }

    const pet = await PetModel.create({ ...result.pet, owner: req.user._id });
    await logAction('Pet Added', req.user, { affected: pet.name });
    res.status(201).json({ pet });
  } catch (err) {
    serverError(res, err);
  }
};

// PUT /api/pets/:id  - edit one of YOUR pets
const updatePet = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Pet not found.' });

    const pet = await PetModel.findOne({ _id: req.params.id, owner: req.user._id });
    if (!pet) return res.status(404).json({ message: 'Pet not found.' });

    const result = cleanPet(req.body);
    if (result.error) return res.status(400).json({ message: result.error });

    Object.assign(pet, result.pet); // the owner is never taken from the request
    await pet.save();
    await logAction('Pet Updated', req.user, { affected: pet.name });
    res.json({ pet });
  } catch (err) {
    serverError(res, err);
  }
};

// POST /api/pets/delete  { ids: [...] }  - delete one or more of YOUR pets
const deletePets = async (req, res) => {
  try {
    const ids = Array.isArray(req.body && req.body.ids) ? req.body.ids : [];
    if (ids.length === 0 || ids.length > 100 || !ids.every((id) => typeof id === 'string' && mongoose.isValidObjectId(id))) {
      return res.status(400).json({ message: 'Choose at least one pet to delete.' });
    }

    const result = await PetModel.deleteMany({ _id: { $in: ids }, owner: req.user._id });
    await logAction('Pet Deleted', req.user, { affected: `${result.deletedCount} pet(s)` });
    res.json({ deleted: result.deletedCount });
  } catch (err) {
    serverError(res, err);
  }
};

module.exports = { cleanPet, listMyPets, createPet, updatePet, deletePets };