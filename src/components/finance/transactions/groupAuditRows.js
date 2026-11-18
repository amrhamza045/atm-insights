export default function groupAuditRows(rows){
 const groups=new Map();
 for(const row of rows){
  const key=row.group_key||`${row.source_entity}:${row.id}`;
  const ref={entity:row.source_entity,id:row.id,name:row.source_name};
  if(!groups.has(key)){groups.set(key,{...row,group_key:key,sources:[ref],purchase_orders:[...(row.purchase_orders||[])],journal_entries:[...(row.journal_entries||[])]});continue;}
  const group=groups.get(key);
  if(row.mapping&&(!group.mapping||group.mapping.status==='ready'&&row.mapping.status!=='ready'))group.mapping=row.mapping;
  if(!group.sources.some(s=>s.entity===ref.entity&&s.id===ref.id))group.sources.push(ref);
  for(const order of row.purchase_orders||[])if(!group.purchase_orders.some(p=>p.id===order.id))group.purchase_orders.push(order);
  for(const journal of row.journal_entries||[])if(!group.journal_entries.some(j=>j.id===journal.id))group.journal_entries.push(journal);
 }
 return [...groups.values()];
}