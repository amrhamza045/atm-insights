export function profitMargin(profit,revenue){
 return typeof profit==='number'&&typeof revenue==='number'&&Number.isFinite(profit)&&Number.isFinite(revenue)&&revenue>0?profit/revenue*100:null;
}
export function periodChartLabel(period){
 if(!/^\d{4}-\d{2}$/.test(period))return period;
 return new Intl.DateTimeFormat('en',{month:'short',year:'2-digit',timeZone:'UTC'}).format(new Date(`${period}-01T00:00:00Z`));
}