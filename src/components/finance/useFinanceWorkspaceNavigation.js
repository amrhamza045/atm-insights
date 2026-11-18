import { useRef } from 'react';
import { useLocation,useNavigate } from 'react-router-dom';
import useTrailPath from '@/lib/useTrailPath';
import { FINANCE_WORKSPACE_GROUPS } from '@/components/finance/financeWorkspaceGroups';
export default function useFinanceWorkspaceNavigation(features){
 const location=useLocation(),navigate=useNavigate(),remembered=useRef({});
 const params=new URLSearchParams(location.search),requested=features.find(f=>f.id===params.get('tab'));
 const groups=FINANCE_WORKSPACE_GROUPS.filter(g=>features.some(f=>f.group===g.id));
 const group=groups.find(g=>g.id===params.get('finance_view'))||groups.find(g=>g.id===requested?.group)||groups[0];
 const sections=features.filter(f=>f.group===group?.id);
 const section=sections.find(f=>f.id===requested?.id)||sections.find(f=>f.id===remembered.current[group?.id])||sections[0];
 const urlFor=(groupId,sectionId)=>{const p=new URLSearchParams(location.search);p.set('finance_view',groupId);p.set('tab',sectionId);return `${location.pathname}?${p}`;};
 const first=g=>features.find(f=>f.id===remembered.current[g.id]&&f.group===g.id)||features.find(f=>f.group===g.id);
 useTrailPath([{label:'Finance',url:location.pathname,children:groups.map(g=>({label:g.title,url:urlFor(g.id,first(g).id)}))},...(group&&section?[{label:group.title,url:urlFor(group.id,section.id),children:sections.map(s=>({label:s.title,url:urlFor(group.id,s.id)}))},{label:section.title,url:urlFor(group.id,section.id)}]:[])]);
 const select=(groupId,sectionId)=>{if(group&&section)remembered.current[group.id]=section.id;remembered.current[groupId]=sectionId;const url=urlFor(groupId,sectionId);if(url!==location.pathname+location.search)navigate(url);};
 return {groups,group,sections,section,selectGroup:id=>{const g=groups.find(g=>g.id===id);if(g)select(id,first(g).id);},selectSection:id=>select(group.id,id)};
}