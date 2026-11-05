export const TOTAL_STAGES=100;
const GOALS=[5,10,15,20,25,30,40,50,60,70,80,90];
export function stageGoal(stage:number){return GOALS[stage-1]??100+(stage-GOALS.length-1)*10;}
export function stageStart(stage:number){let total=0;for(let i=1;i<stage;i++)total+=stageGoal(i);return total;}
export function stageFromAnswers(answers:number){let stage=1;while(stage<TOTAL_STAGES&&answers>=stageGoal(stage)){answers-=stageGoal(stage);stage++;}return stage;}
