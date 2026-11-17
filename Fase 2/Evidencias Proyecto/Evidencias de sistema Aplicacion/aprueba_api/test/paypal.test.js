import {test} from 'node:test';
import assert from 'node:assert/strict';
import {paidPeriod,sandboxApprovalUrl} from '../src/services/paypalSandbox.js';
const record={id:'I-TEST',providerPlanId:'P-TEST',uid:'student',currency:'USD',amount:'4.99'};
const subscription={id:record.id,plan_id:record.providerPlanId,custom_id:record.uid,status:'ACTIVE'};
const payment={id:'SALE-TEST',status:'COMPLETED',time:'2026-01-31T12:00:00Z',amount_with_breakdown:{gross_amount:{currency_code:'USD',value:'4.99'}}};
test('sandbox redirect never permits live PayPal or foreign hosts',()=>{
 assert.ok(sandboxApprovalUrl('https://www.sandbox.paypal.com/webapps/billing/subscriptions?ba_token=test'));
 for(const u of ['https://www.paypal.com/','https://www.sandbox.paypal.com.evil.test/','http://www.sandbox.paypal.com/','javascript:alert(1)'])assert.equal(sandboxApprovalUrl(u),null);
});
test('approval is insufficient; only a completed payment enables access',()=>{
 assert.equal(paidPeriod({...subscription,status:'APPROVAL_PENDING'},{transactions:[payment]},record,new Date('2026-02-01')),null);
 assert.equal(paidPeriod(subscription,{transactions:[]},record,new Date('2026-02-01')),null);
 for(const status of ['PENDING','REFUNDED','DENIED'])assert.equal(paidPeriod(subscription,{transactions:[{...payment,status}]},record,new Date('2026-02-01')),null);
});
test('period is derived from verified payment and clamps month end',()=>{
 const result=paidPeriod(subscription,{transactions:[payment]},record,new Date('2026-02-01'));
 assert.equal(result.end.toISOString(),'2026-02-28T12:00:00.000Z');
 assert.equal(paidPeriod(subscription,{transactions:[payment]},record,new Date('2026-03-01')),null);
});
test('foreign subscriptions, incorrect amounts and future payments do not grant access',()=>{
 assert.throws(()=>paidPeriod({...subscription,custom_id:'another-student'},{transactions:[payment]},record));
 assert.throws(()=>paidPeriod({...subscription,plan_id:'P-OTHER'},{transactions:[payment]},record));
 for(const gross_amount of [{currency_code:'EUR',value:'4.99'},{currency_code:'USD',value:'0.01'}])assert.equal(paidPeriod(subscription,{transactions:[{...payment,amount_with_breakdown:{gross_amount}}]},record,new Date('2026-02-01')),null);
 assert.equal(paidPeriod(subscription,{transactions:[{...payment,time:'2027-01-01T00:00:00Z'}]},record,new Date('2026-02-01')),null);
});
test('cancelling renewal preserves only the verified paid period',()=>{
 assert.ok(paidPeriod({...subscription,status:'CANCELLED'},{transactions:[payment]},record,new Date('2026-02-01')));
});
