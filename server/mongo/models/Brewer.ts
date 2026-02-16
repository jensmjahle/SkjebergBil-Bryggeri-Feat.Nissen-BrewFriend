import mongoose from "mongoose";

const brewerSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 40,
    },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    phoneNumber: { type: String, trim: true, maxlength: 40 },
    passwordHash: { type: String, required: true },
    profileImageUrl: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true },
);

export const Brewer: any =
  mongoose.models.Brewer || mongoose.model("Brewer", brewerSchema);
