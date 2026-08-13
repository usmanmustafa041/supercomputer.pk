import "server-only";
import { query } from "@/lib/db/client";
import { sendEmail } from "@/lib/email";

export async function notifyQuoteCreated(input:{reference:string;customerName:string;customerEmail:string}):Promise<void>{
  const sales=process.env.SALES_NOTIFICATION_EMAIL ?? process.env.ADMIN_EMAIL;
  const jobs:Array<Promise<unknown>>=[];
  if(sales) jobs.push(sendEmail(sales,`New quote request ${input.reference}`,`${input.customerName} submitted ${input.reference}. Open the admin portal to review it.`).then(ok=>log("quote.created","email",sales,input.reference,ok)));
  jobs.push(sendEmail(input.customerEmail,`We received your request ${input.reference}`,`Thank you ${input.customerName}. We received your configuration and our sales team will review it. Reference: ${input.reference}`).then(ok=>log("quote.confirmation","email",input.customerEmail,input.reference,ok)));
  const webhook=process.env.SALES_NOTIFICATION_WEBHOOK_URL;
  if(webhook) jobs.push(fetch(webhook,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({text:`New quote ${input.reference} from ${input.customerName} (${input.customerEmail})`})}).then(r=>log("quote.created","webhook",webhook,input.reference,r.ok)));
  await Promise.allSettled(jobs);
}

async function log(event:string,channel:string,recipient:string,entityId:string,ok:boolean){await query(`INSERT INTO notification_events(event_type,channel,recipient,entity_type,entity_id,status,attempts,sent_at) VALUES($1,$2,$3,'quote',$4,$5,1,$6)`,[event,channel,recipient,entityId,ok?'sent':'failed',ok?new Date():null]);}
