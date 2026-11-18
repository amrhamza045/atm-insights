export default function auditRoutingPriority(bindings,key,from,conditions,to=''){
  const overlaps=(bindings||[]).filter(b=>b.mapping_key===key&&(!to||b.effective_from<=to)&&(!from||!b.effective_to||b.effective_to>=from)&&!Object.entries(conditions).some(([k,v])=>b.conditions?.[k]&&b.conditions[k]!==v));
 const highest=Math.max(-1,...overlaps.map(b=>b.priority));
 return {overlaps,priority:highest>=1000?null:Math.max(100,highest+1)};
}