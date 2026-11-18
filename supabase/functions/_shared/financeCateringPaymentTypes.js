export const CATERING_PAYMENT_TYPES=['deposit','final_balance','additional','refund','penalty','deposit_withdrawal'];
export const CATERING_PAYMENT_REFERENCES=['catering_payment','catering_credit_note','catering_deposit_withdrawal'];
export const outgoingAdvance=p=>['refund','deposit_withdrawal'].includes(p.payment_type);
export const mappedCateringPayment=p=>p&&CATERING_PAYMENT_TYPES.includes(p.payment_type)&&(!p.credit_note||p.payment_type==='refund');
export const cateringPaymentKeys=p=>p.payment_type==='penalty'?['CUSTOMER_ADVANCE_ACC','Cancellation_Customer']:outgoingAdvance(p)?['CUSTOMER_ADVANCE_ACC','PAYMENT_METHOD_ACC']:['PAYMENT_METHOD_ACC','CUSTOMER_ADVANCE_ACC'];