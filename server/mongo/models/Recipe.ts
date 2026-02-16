import mongoose from "mongoose";

const recipeStepSchema = new mongoose.Schema(
  {
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
      og: { type: Number },
      fg: { type: Number },
      sg: { type: Number },
      co2Volumes: { type: Number },
      ibu: { type: Number },
    },
    steps: { type: [recipeStepSchema], default: [] },
  },
  { timestamps: true },
);

recipeSchema.index({ brewerId: 1, name: 1 });

export const Recipe: any =
  mongoose.models.Recipe || mongoose.model("Recipe", recipeSchema);
