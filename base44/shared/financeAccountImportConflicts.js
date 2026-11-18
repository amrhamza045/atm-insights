// Suggestions change only incoming rows, never existing account codes.
export function accountImportConflicts(rows,chart){
 const existing=new Map(chart.map(a=>[a.code,a])),seen=new Set(),used=new Set([...chart,...rows].map(a=>a.code)),conflicts=[];
 for(const [index,row] of rows.entries()){
  const repeated=seen.has(row.code),account=existing.get(row.code);seen.add(row.code);
  if(!repeated&&!account)continue;
  let suggested='';
  if(/^[1-8][0-9]{0,11}$/.test(row.code)){
   const start=Number(row.code),ceiling=(Number(row.code[0])+1)*10**(row.code.length-1);
   for(let step=1;step<=used.size+1&&start+step<ceiling;step++){const code=String(start+step);if(!used.has(code)){suggested=code;break;}}
   if(!suggested){let code=row.code;while(code.length<12){code+='0';if(!used.has(code)){suggested=code;break;}}}
   if(suggested)used.add(suggested);
  }
  conflicts.push({row:index+2,code:row.code,suggested_code:suggested,reason:repeated?'Repeated in this sheet':`Existing account: ${account.name}`});
 }
 return conflicts;
}