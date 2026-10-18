import axios from 'axios';
import { API_URL } from '../../auth';

// A receipt is made when "Pay Now" is pressed and is kept in this browser tab (sessionStorage),
// so the Receipt page can show it right away and it survives a refresh.
// The Receipt page then also saves it on the server (syncReceipt), so it can be opened again later
// from My Payments, on any device.
const keyOf = (id) => `receipt:${id}`;

// turns an id like "6650f1c2a9b3..." into only digits (the same id always gives the same digits)
// KEEP IN SYNC with numbersFor() in server/controllers/paymentsController.js
const digitsOf = (text) => text.split('').map((c) => String(parseInt(c, 16) % 10)).join('');

// reservationId: _id of the saved booking (used to make the receipt and booking numbers)
// data: everything shown on the receipt. Returns the receipt number (used in the page address).
export const saveReceipt = (reservationId, data) => {
  const hex = String(reservationId || Date.now().toString(16) + Math.random().toString(16).slice(2)).replace(/[^0-9a-f]/gi, '0');
  const padded = hex.padEnd(24, '0');
  const receiptNo = `r-${digitsOf(padded.slice(0, 12)).slice(0, 10)}`;
  const bookingNo = `b-${digitsOf(padded.slice(-15)).slice(0, 15)}`;
  const receipt = { ...data, reservationId: reservationId || null, receiptNo, bookingNo, issuedAt: new Date().toISOString() };
  try {
    sessionStorage.setItem(keyOf(receiptNo), JSON.stringify(receipt));
  } catch (err) {
    /* storage unavailable: the receipt page then shows the sample */
  }
  return receiptNo;
};

export const readReceipt = (id) => {
  try {
    return JSON.parse(sessionStorage.getItem(keyOf(id)));
  } catch (err) {
    return null;
  }
};

// saves the receipt (and the payment it proves) on the server. Safe to call again: it never saves twice.
export const syncReceipt = (receipt) => axios.post(`${API_URL}/my/payments/receipt`, { receipt });