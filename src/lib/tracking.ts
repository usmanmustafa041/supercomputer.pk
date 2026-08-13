import "server-only";import{createHmac,timingSafeEqual}from"node:crypto";
function signature(type:string,id:string){return createHmac("sha256",process.env.AUTH_ENCRYPTION_KEY??"development-only-change-this-key").update(`${type}:${id}`).digest("hex");}
export function openTrackingUrl(type:"quote"|"invoice",id:string){const base=(process.env.APP_URL??"http://localhost:3000").replace(/\/$/,"");return `${base}/api/track/open?type=${type}&id=${encodeURIComponent(id)}&token=${signature(type,id)}`;}
export function validTrackingToken(type:string,id:string,token:string){const expected=signature(type,id);if(token.length!==expected.length)return false;return timingSafeEqual(Buffer.from(token),Buffer.from(expected));}
