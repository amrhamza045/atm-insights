export default function routingSourceMatch(detail,from,to,conditions){
 return (!from||detail.source_date>=from)&&(!to||detail.source_date<=to)&&Object.entries(conditions).every(([key,value])=>detail.routing.context?.[key]===value);
}