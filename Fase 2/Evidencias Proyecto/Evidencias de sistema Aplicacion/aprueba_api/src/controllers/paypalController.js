import {startPaypalPlan,syncPaypalPlan,cancelPaypalPlan} from '../services/paypalPlans.js';
const execute=fn=>async(req,res)=>{try{return res.success(await fn(req.user.sub,req.body));}catch(error){return res.fail(error.status?error.message:'No se pudo completar la operación en PayPal Sandbox',null,error.status||503);}};
export const createPaypalSubscription=execute(startPaypalPlan);
export const getPaypalSubscription=execute(syncPaypalPlan);
export const cancelPaypalSubscription=execute(cancelPaypalPlan);
