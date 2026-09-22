export type TransactionType='income'|'deduction'|'expense'|'savings'|'investment'|'debt';
export interface Category { id:string; name:string; group:string; type:'expense'|'deduction'|'savings'; }
export interface Transaction { id:string; date:string; type:TransactionType; categoryId:string; subcategory?:string; description:string; amount:number; account:string; paymentMethod:string; notes?:string; createdAt:string; updatedAt:string; demo?:boolean; }
export interface Budget { id:string; month:string; categoryId:string; limit:number; }
export interface RecurringTransaction { id:string; active:boolean; type:TransactionType; categoryId:string; concept:string; amount:number; frequency:'monthly'; day:number; }
export interface Account { id:string; name:string; balance?:number; }
export interface MonthlySummary { month:string; income:number; deductions:number; expenses:number; savings:number; investments:number; available:number; savingsRate:number; }
