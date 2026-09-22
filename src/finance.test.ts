import {describe,it,expect} from 'vitest'; import {summary,budgetStatus} from './finance';
const x=(type:any,amount:number)=>({id:'1',type,amount,date:'2026-09-01'} as any);
describe('cálculos financieros',()=>{it('calcula disponible y ahorro',()=>{const s=summary([x('income',1000),x('deduction',100),x('expense',300),x('savings',200),x('investment',100)],'2026-09');expect(s.available).toBe(300);expect(s.savingsRate).toBe(.3)});it('calcula presupuesto',()=>expect(budgetStatus(750,1000)).toEqual({percent:75,remaining:250}));});
