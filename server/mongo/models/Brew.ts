import mongoose from "mongoose";

const measurementSchema = new mongoose.Schema(
  {
    takenAt: { type: Date, default: Date.now, index: true },
    temperatureC: { type: Number },
    og: { type: Number },
    fg: { type: Number },
    sg: { type: Number },
    ph: { type: Number },
    co2Volumes: { type: Number },
    ibu: { type: Number },
    note: { type: String, trim: true, maxlength: 1000 },
  },
  { _id: true },
);

const brewSchema = new mongoose.Schema(
  {
    brewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brewer",
      required: true,
      index: true,
    },
    recipeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Recipe",
      required: false,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 160 },
    status: {
      type: String,
      enum: ["planned", "active", "conditioning", "completed", "archived"],
      default: "planned",
      index: true,
    },
    notes: { type: String, trim: true, maxlength: 3000 },
    timeline: {
      plannedStartAt: { type: Date },
      brewDayAt: { type: Date },
      fermentationStartAt: { type: Date },
      fermentationEndAt: { type: Date },
      bottledAt: { type: Date },
      keggedAt: { type: Date },
      completedAt: { type: Date },
    },
    targetMetrics: {
      og: { type: Number },
      fg: { type: Number },
      sg: { type: Number },
      co2Volumes: { type: Number },
      ibu: { type: Number },
      ph: { type: Number },
    },
    measurements: { type: [measurementSchema], default: [] },
  },
  { timestamps: true },
);

brewSchema.index({ brewerId: 1, createdAt: -1 });
brewSchema.index({ brewerId: 1, status: 1 });

export const Brew: any =
  mongoose.models.Brew || mongoose.model("Brew", brewSchema);
