import mongoose from "mongoose";

const recipeStepSchema = new mongoose.Schema(
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

const recipeIngredientSchema = new mongoose.Schema(
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
    price: { type: Number, min: 0 },
    notes: { type: String, trim: true, maxlength: 1000 },
    stepIds: { type: [String], default: [] },
  },
  { _id: false },
);

const gravityPattern = /^1\.\d{3}$/;

const recipeSchema = new mongoose.Schema(
  {
    brewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brewer",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 160 },
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
      batchSizeLiters: { type: Number, min: 0 },
    },
    steps: { type: [recipeStepSchema], default: [] },
    ingredients: { type: [recipeIngredientSchema], default: [] },
  },
  { timestamps: true },
);

recipeSchema.index({ brewerId: 1, name: 1 });

export const Recipe: any =
  mongoose.models.Recipe || mongoose.model("Recipe", recipeSchema);
