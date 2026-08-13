"use client";
import {useEffect}from"react";import{usePathname}from"next/navigation";
export default function PrivacyAnalytics(){const path=usePathname();useEffect(()=>{const endpoint=process.env.NEXT_PUBLIC_ANALYTICS_URL;if(!endpoint||navigator.doNotTrack==="1")return;const controller=new AbortController();fetch(endpoint,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({path,site:"supercomputers.pk"}),keepalive:true,signal:controller.signal}).catch(()=>undefined);return()=>controller.abort();},[path]);return null;}
