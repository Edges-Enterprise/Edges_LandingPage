// src/actions/reseller/plans/index.ts
"use server";

// Plan management actions
export { getPlans } from "./getPlans";
export { togglePlan } from "./togglePlan";
export { updatePlanConfig } from "./updatePlanConfig";
export { bulkUpdatePlans } from "./bulkUpdatePlans";

// Legacy actions (kept for backward compatibility)
export { createPlan } from "./createPlan";
export { updatePlan } from "./updatePlan";
export { deletePlan } from "./deletePlan";
