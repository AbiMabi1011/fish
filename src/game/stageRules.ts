/**
 * Stage progression math: how many correct answers are needed for each stage (1 to 100).
 */
export const TOTAL_STAGES = 100;

const STAGE_GOALS = [5, 10, 15, 20, 25, 30, 40, 50, 60, 70, 80, 90];

/** Correct answers required to finish a given stage. */
export function stageGoal(stage: number) {
  const fixedGoal = STAGE_GOALS[stage - 1];
  if (fixedGoal !== undefined) return fixedGoal;
  return 100 + (stage - STAGE_GOALS.length - 1) * 10;
}

/** Total correct answers needed before reaching a given stage. */
export function stageStart(stage: number) {
  let total = 0;
  for (let current = 1; current < stage; current++) {
    total += stageGoal(current);
  }
  return total;
}

/** Converts a player's total correct answers into their current stage number. */
export function stageFromAnswers(answers: number) {
  let remaining = answers;
  let stage = 1;

  while (stage < TOTAL_STAGES && remaining >= stageGoal(stage)) {
    remaining -= stageGoal(stage);
    stage++;
  }

  return stage;
}
