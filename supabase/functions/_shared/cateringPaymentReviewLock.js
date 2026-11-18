export async function withCateringPaymentReviewLock(svc,eventId,work){
 const {records}=await svc.entities.CateringPaymentReviewLock.upsert([{event_id:eventId}],{key:'event_id'});
 const entity=svc.entities.CateringPaymentReviewLock,id=records[0].id,token=crypto.randomUUID();
 await entity.updateMany({id,$or:[{token:''},{token:{$exists:false}}]},{$set:{token,started_at:new Date().toISOString()}});
 const locked=await entity.get(id);
 if(locked.token!==token)throw Object.assign(new Error('Another payment decision is in progress for this event. Retry shortly; an interrupted lock needs administrative review.'),{status:409});
 let release=true;
 try{return await work(await svc.entities.CateringEvent.get(eventId));}
 catch(error){if(error.rollbackFailed)release=false;throw error;}
 finally{if(release)await entity.updateMany({id,token},{$set:{token:'',started_at:''}});}
}