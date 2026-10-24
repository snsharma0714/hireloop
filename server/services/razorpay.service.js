import dotenv from "dotenv"
dotenv.config()
import Razorpay from "razorpay"

// Created on first use, so the server still starts when the Razorpay keys aren't set yet
let razorpay = null

export const paymentsConfigured = () => Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET)

export const getRazorpay = () => {
  if (!razorpay) {
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpay
}
