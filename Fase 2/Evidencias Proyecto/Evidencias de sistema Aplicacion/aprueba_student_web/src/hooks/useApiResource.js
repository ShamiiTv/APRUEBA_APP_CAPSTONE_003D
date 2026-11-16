import {useCallback,useEffect,useState} from 'react';
import {apiFetch} from '../api/client';
import {useAuth} from '../auth/useAuth';
export function useApiResource(path) {
  const {user}=useAuth();const uid=user?.uid;
  const [revision,setRevision]=useState(0),[record,setRecord]=useState(null);
  const refresh=useCallback(()=>setRevision(v=>v+1),[]);
  const key=`${uid}:${path}:${revision}`;
  useEffect(()=>{
    if(!path || !uid)return;
    const controller=new AbortController();
    apiFetch(path,{signal:controller.signal}).then(res=>{if(!controller.signal.aborted)setRecord({key,data:res.data});}).catch(err=>{if(!controller.signal.aborted)setRecord({key,error:err.message});});
    return ()=>controller.abort();
  },[path,uid,key]);
  return {data:record?.key===key?record.data:null,error:record?.key===key?record.error:null,loading:!!path && !!uid && record?.key!==key,refresh};
}
