import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildStudyPlan,validateStudyPlan } from '../src/services/studyPlan.js';
const subject = (testId,extra={}) => ({ testId,label:testId,answered:0,accuracy:null,available:20,completed:0,remaining:20,today:{ answered:0 },...extra });
const progress = (subjects,extra={}) => ({ subjects,quota:{ date:'2026-10-09',used:0,max:20,unlimited:false },updatedAt:'2026-10-09T15:00:00Z',...extra });

test('new plan uses selected tests and keeps unavailable subjects visible without invented tasks', () => {
  const plan=buildStudyPlan({ selectedTests:['m1','hist'] },progress([subject('m1'),subject('hist',{ available:0,remaining:0 })]));
  assert.equal(plan.saved,false);
  assert.equal(plan.scheduled,10);
  assert.equal(plan.tasks[1].reason,'unavailable');
  assert.equal(plan.tasks[1].scheduled,0);
});
test('daily completion uses only selected tests and allocations respect quota and remaining questions', () => {
  const plan=buildStudyPlan({ studyPlan:{ dailyGoal:10,testIds:['m1','m2'] } },progress([subject('m1',{ remaining:1,today:{ answered:3 } }),subject('m2'),subject('lectora',{ today:{ answered:9 } })],{ quota:{ date:'2026-10-09',used:18,max:20 } }));
  assert.equal(plan.completedToday,3);
  assert.equal(plan.scheduled,2);
  assert.equal(plan.tasks[0].scheduled,1);
  assert.equal(plan.remainingGoal,7);
});
test('meeting the goal creates no extra assignments or rewards', () => {
  const plan=buildStudyPlan({ studyPlan:{ dailyGoal:5,testIds:['m1'] } },progress([subject('m1',{ today:{ answered:6 } })]));
  assert.equal(plan.remainingGoal,0);
  assert.equal(plan.scheduled,0);
});
test('weak-test priority requires at least five answers and does not claim mastery', () => {
  const plan=buildStudyPlan({ studyPlan:{ dailyGoal:1,testIds:['m1','m2'] } },progress([subject('m1'),subject('m2',{ answered:5,accuracy:40 })]));
  assert.equal(plan.tasks[1].reason,'reinforce');
  assert.equal(plan.tasks[1].scheduled,1);
});
test('completed and empty banks are distinct and never receive impossible assignments', () => {
  const plan=buildStudyPlan({ selectedTests:['m1'] },progress([subject('m1',{ completed:20,remaining:0 })]));
  assert.equal(plan.tasks[0].reason,'bank_completed');
  assert.equal(plan.scheduled,0);
});
test('settings reject invalid goals, duplicates, unknown tests and attempts to update another user', () => {
  for (const value of [null,{}, { dailyGoal:0,testIds:['m1'] },{ dailyGoal:21,testIds:['m1'] },{ dailyGoal:1.5,testIds:['m1'] },{ dailyGoal:10,testIds:[] },{ dailyGoal:10,testIds:['m1','m1'] },{ dailyGoal:10,testIds:['fake'] },{ dailyGoal:10,testIds:['m1'],userId:'other' }]) assert.equal(validateStudyPlan(value),false);
  assert.equal(validateStudyPlan({ dailyGoal:20,testIds:['m1','hist'] }),true);
});
