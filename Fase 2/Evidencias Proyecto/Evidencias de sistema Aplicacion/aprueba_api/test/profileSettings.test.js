import { test } from 'node:test';
import assert from 'node:assert/strict';
import { profilePatch } from '../src/services/profileSettings.js';

test('mobile reminder times persist without allowing invalid schedules or account privileges',()=>{
  assert.deepEqual(profilePatch({reminderTime:'23:59',dailyReminder:true}),{dailyReminder:true,reminderTime:'23:59'});
  for(const value of ['24:00','12:60','8:30',null,123]) assert.throws(()=>profilePatch({reminderTime:value}));
  assert.throws(()=>profilePatch({reminderTime:'20:00',plan:'all'}));
});

test('profile edits normalize names and allow clearing optional fields', () => {
  assert.deepEqual(profilePatch({ name:'  Alumna Pérez  ',school:' ',region:'' }),{ name:'Alumna Pérez',nameLower:'alumna pérez',school:'',region:'' });
});
test('typed preferences persist false reminders and ordered test selections', () => {
  assert.deepEqual(profilePatch({ theme:'dark',locale:'en',dailyReminder:false,selectedTests:['m2','m1'],difficulty:'d3' }),{ theme:'dark',locale:'en',dailyReminder:false,selectedTests:['m2','m1'],difficulty:'d3' });
});
test('legacy lang alias maps to locale and conflicting aliases fail', () => {
  assert.deepEqual(profilePatch({ lang:'en' }),{ locale:'en' });
  assert.throws(() => profilePatch({ locale:'es',lang:'en' }),{ code:'INVALID_PROFILE' });
});
test('empty names, oversized fields and wrong types are rejected before writing', () => {
  for (const body of [null,[],{}, {name:' '},{name:42},{name:'a'.repeat(121)},{school:{}},{school:'a'.repeat(201)},{region:'a'.repeat(101)},{dailyReminder:'false'},{locale:null},{theme:'other'},{difficulty:'d9'}]) assert.throws(() => profilePatch(body),{ status:400 });
});
test('empty, duplicate and unknown selected tests are rejected', () => {
  for (const selectedTests of [[],['m1','m1'],['fake'],'m1']) assert.throws(() => profilePatch({ selectedTests }),{ status:400 });
});
test('generic profile edits cannot change account security, rewards, quota or paid access', () => {
  for (const field of ['uid','userId','email','password','role','medals','quota','plan','planStatus','onboardingCompleted','studyPlan']) assert.throws(() => profilePatch({ name:'Alumna',[field]:'changed' }),{ status:400 });
});
test('partial edits preserve unrelated fields and unsupported practice formats are not advertised', () => {
  assert.deepEqual(profilePatch({ theme:'light' }),{ theme:'light' });
  assert.throws(() => profilePatch({ practiceFormat:'axis' }),{ status:400 });
});
