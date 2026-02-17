import PreparationStepForm from "@/components/recipe-steps/PreparationStepForm.vue";
import MashStepForm from "@/components/recipe-steps/MashStepForm.vue";
import SpargeStepForm from "@/components/recipe-steps/SpargeStepForm.vue";
import BoilStepForm from "@/components/recipe-steps/BoilStepForm.vue";
import PrimaryFermentationStepForm from "@/components/recipe-steps/PrimaryFermentationStepForm.vue";
import SecondaryFermentationStepForm from "@/components/recipe-steps/SecondaryFermentationStepForm.vue";
import ColdCrashStepForm from "@/components/recipe-steps/ColdCrashStepForm.vue";
import CarbonationStepForm from "@/components/recipe-steps/CarbonationStepForm.vue";
import ConditioningStepForm from "@/components/recipe-steps/ConditioningStepForm.vue";
import CustomStepForm from "@/components/recipe-steps/CustomStepForm.vue";

export const STEP_TYPE_OPTIONS = [
  { label: "Forberedning", value: "preparation" },
  { label: "Mesking", value: "mash" },
  { label: "Skylling", value: "sparge" },
  { label: "Koking", value: "boil" },
  { label: "Gjæring", value: "primary_fermentation" },
  { label: "Sekundær Gjæring", value: "secondary_fermentation" },
  { label: "Cold Crash", value: "cold_crash" },
  { label: "Karbonering", value: "carbonation" },
  { label: "Modning", value: "conditioning" },
  { label: "Eget Steg", value: "custom" },
];

export const STEP_COMPONENTS = {
  preparation: PreparationStepForm,
  mash: MashStepForm,
  sparge: SpargeStepForm,
  boil: BoilStepForm,
  primary_fermentation: PrimaryFermentationStepForm,
  secondary_fermentation: SecondaryFermentationStepForm,
  cold_crash: ColdCrashStepForm,
  carbonation: CarbonationStepForm,
  conditioning: ConditioningStepForm,
  custom: CustomStepForm,
};

function newStepId() {
  if (globalThis.crypto?.randomUUID) return `step-${globalThis.crypto.randomUUID()}`;
  return `step-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createDefaultStep(stepType) {
  const base = {
    stepId: newStepId(),
    stepType,
    title: "",
    description: "",
    durationMinutes: null,
    temperatureC: null,
    co2Volumes: null,
    data: {},
  };

  switch (stepType) {
    case "preparation":
      return { ...base, title: "Forberedning", data: { checklist: "" } };
    case "mash":
      return {
        ...base,
        title: "Mesking",
        temperatureC: 67,
        durationMinutes: 60,
        data: { waterAmountL: 18, waterToGrainRatio: "" },
      };
    case "sparge":
      return {
        ...base,
        title: "Skylling",
        temperatureC: 76,
        durationMinutes: 20,
        data: { waterAmountL: 16 },
      };
    case "boil":
      return {
        ...base,
        title: "Koking",
        temperatureC: 100,
        durationMinutes: 60,
        data: { hopSchedule: "" },
      };
    case "primary_fermentation":
      return {
        ...base,
        title: "Gjæring",
        temperatureC: 20,
        durationMinutes: 10080,
        data: { targetGravity: "" },
      };
    case "secondary_fermentation":
      return { ...base, title: "Sekundær Gjæring", temperatureC: 16, durationMinutes: 10080 };
    case "cold_crash":
      return { ...base, title: "Cold Crash", temperatureC: 2, durationMinutes: 2880 };
    case "carbonation":
      return { ...base, title: "Karbonering", co2Volumes: 2.4, temperatureC: 20, data: { method: "" } };
    case "conditioning":
      return { ...base, title: "Modning", temperatureC: 12, durationMinutes: 20160 };
    default:
      return { ...base, title: "Eget steg", stepType: "custom" };
  }
}
