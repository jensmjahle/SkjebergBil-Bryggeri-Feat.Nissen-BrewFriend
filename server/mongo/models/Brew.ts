import mongoose from "mongoose";

const gravityPattern = /^1\.\d{3}$/;

const brewStepSchema = new mongoose.Schema(
  {
    stepId: { type: String, required: true, trim: true, maxlength: 80 },
    order: { type: Number, required: true, min: 1 },
    stepType: { type: String, required: true, default: "custom" },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 3000 },
    durationMinutes: { type: Number, min: 0 },
    temperatureC: { type: Number },
    co2Volumes: { type: Number },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: false },
);

const brewIngredientSchema = new mongoose.Schema(
  {
    ingredientId: { type: String, required: true, trim: true, maxlength: 80 },
    name: { type: String, required: true, trim: true, maxlength: 160 },
    category: {
      type: String,
      required: true,
      enum: ["fermentable", "hops", "other"],
      default: "other",
    },
    amount: { type: String, trim: true, maxlength: 80 },
    unit: { type: String, trim: true, maxlength: 40 },
    notes: { type: String, trim: true, maxlength: 1000 },
    stepIds: { type: [String], default: [] },
  },
  { _id: false },
);

const recipeSnapshotSchema = new mongoose.Schema(
  {
    recipeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Recipe",
      required: false,
      index: true,
    },
    name: { type: String, trim: true, maxlength: 160 },
    beerType: { type: String, trim: true, maxlength: 120 },
    flavorProfile: { type: String, trim: true, maxlength: 1200 },
    color: { type: String, trim: true, maxlength: 120 },
    imageUrl: { type: String, trim: true, maxlength: 500 },
    defaults: {
      ogFrom: { type: String, trim: true, match: gravityPattern },
      ogTo: { type: String, trim: true, match: gravityPattern },
      fgFrom: { type: String, trim: true, match: gravityPattern },
      fgTo: { type: String, trim: true, match: gravityPattern },
      co2Volumes: { type: Number },
      ibu: { type: Number },
    },
    steps: { type: [brewStepSchema], default: [] },
    ingredients: { type: [brewIngredientSchema], default: [] },
  },
  { _id: false },
);

const stepProgressSchema = new mongoose.Schema(
  {
    stepId: { type: String, required: true, trim: true, maxlength: 80 },
    status: {
      type: String,
      enum: ["pending", "active", "completed"],
      default: "pending",
    },
    startedAt: { type: Date },
    activeSinceAt: { type: Date },
    completedAt: { type: Date },
    timerDurationSeconds: { type: Number, min: 0 },
    timerEndsAt: { type: Date },
    pausedRemainingSeconds: { type: Number, min: 0 },
    accumulatedActiveSeconds: { type: Number, min: 0 },
    actualDurationSeconds: { type: Number, min: 0 },
  },
  { _id: false },
);

const measurementSchema = new mongoose.Schema(
  {
    takenAt: { type: Date, default: Date.now, index: true },
    gravity: { type: Number },
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
      gravity: { type: Number },
      og: { type: Number },
      fg: { type: Number },
      sg: { type: Number },
      co2Volumes: { type: Number },
      ibu: { type: Number },
      ph: { type: Number },
    },
    actualMetrics: {
      og: { type: Number },
      fg: { type: Number },
    },
    recipeSnapshot: { type: recipeSnapshotSchema, default: {} },
    progress: {
      currentStepIndex: { type: Number, default: 0, min: 0 },
      brewStartedAt: { type: Date },
      brewCompletedAt: { type: Date },
      stepProgress: { type: [stepProgressSchema], default: [] },
    },
    measurements: { type: [measurementSchema], default: [] },
  },
  { timestamps: true },
);

brewSchema.index({ brewerId: 1, createdAt: -1 });
brewSchema.index({ brewerId: 1, status: 1 });

export const Brew: any =
  mongoose.models.Brew || mongoose.model("Brew", brewSchema);
