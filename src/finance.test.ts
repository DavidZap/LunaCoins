import { describe, it, expect } from "vitest";
import {
  calculateBudgetScenarioAvailable,
  calculateBudgetedExpenses,
  calculateBudgetRemaining,
  calculateBudgetCapacity,
  calculateBudgetLimits,
  getBudgetAllocationRate,
  getBudgetUnassignedCapacity,
  getCategoryBudgetRate,
  getCategorySpentRate,
  getCategoryUsageRate,
  calculateBudgetUsage,
  calculateCategoryExpenseShare,
  calculateCategoryIncomeShare,
  calculateDailyAvailable,
  calculateDeductions,
  calculateExpenseBreakdown,
  calculateIncome,
  calculateIncomeDistribution,
  calculateLoans,
  calculateRangeDeviation,
  calculateRangeStatus,
  calculateRealAvailable,
  calculateSavings,
  calculateSavingsGoalProgress,
  calculateSavingsRate,
  calculateTotalExpenses,
  calculateUnbudgetedExpenses,
  calculateWealthBuildingRate,
  summary,
  budgetStatus,
} from "./finance";
import type { Budget, Category, FinancialRange, Transaction } from "./types";
const x = (type: any, amount: number) =>
  ({ id: "1", type, amount, date: "2026-09-01" }) as any;
const transaction = (
  id: string,
  type: Transaction["type"],
  amount: number,
  categoryId: string,
): Transaction => ({ ...x(type, amount), id, categoryId }) as Transaction;
const budgets: Budget[] = [
  { id: "budget-food", month: "2026-09", categoryId: "food", limit: 1000 },
  {
    id: "budget-furniture",
    month: "2026-09",
    categoryId: "furniture",
    limit: null,
  },
];
const categories: Category[] = [
  { id: "food", name: "Alimentación", group: "Alimentación", type: "expense" },
  { id: "furniture", name: "Amoblar", group: "Hogar", type: "expense" },
  { id: "deduction", name: "Pensión", group: "Deducciones", type: "deduction" },
  {
    id: "loan",
    name: "Préstamo Vehículo",
    group: "Deducciones",
    type: "deduction",
  },
];
const loanTransactions = [
  transaction("loan-1", "deduction", 400, "loan"),
  transaction("loan-2", "debt", 300, "food"),
  transaction("loan-3", "deduction", 200, "deduction"),
];
const foodRange: FinancialRange = {
  id: "range-food",
  categoryId: "food",
  min: 8,
  max: 12,
  active: true,
};
describe("préstamos", () => {
  it("suma préstamos por tipo y categoría", () =>
    expect(calculateLoans(loanTransactions, categories, "2026-09")).toBe(700));
});
describe("capacidad para presupuestar", () => {
  it("resta compromisos una sola vez y compara topes", () => {
    const transactions = [
      transaction("income", "income", 5000, "income"),
      transaction("health", "deduction", 500, "deduction"),
      transaction("loan", "deduction", 300, "loan"),
      transaction("save", "savings", 400, "save-1"),
    ];
    const categoriesWithLoan = [...categories];
    expect(calculateBudgetCapacity(transactions, categoriesWithLoan, "2026-09")).toBe(3800);
    expect(calculateBudgetLimits(budgets, "2026-09")).toBe(1000);
    expect(getBudgetAllocationRate(1000, 3800)).toBeCloseTo(26.315, 2);
    expect(getBudgetUnassignedCapacity(3800, 1000)).toBe(2800);
    expect(getCategoryBudgetRate(600, 3800)).toBeCloseTo(15.789, 2);
    expect(getCategorySpentRate(800, 3800)).toBeCloseTo(21.053, 2);
    expect(getCategoryUsageRate(800, 600)).toBeCloseTo(133.333, 2);
  });
});
describe("rangos financieros", () => {
  it("clasifica dentro, cerca y fuera del rango", () => {
    expect(calculateRangeStatus(10, foodRange)).toBe("inside");
    expect(calculateRangeStatus(7.7, foodRange)).toBe("near");
    expect(calculateRangeStatus(15, foodRange)).toBe("above");
    expect(calculateRangeStatus(3, foodRange)).toBe("below");
    expect(calculateRangeDeviation(15, foodRange)).toBe(3);
    expect(calculateRangeStatus(10)).toBe("unconfigured");
  });
  it("calcula participación, ahorro y patrimonio sin NaN", () => {
    expect(calculateCategoryIncomeShare(110, 1000)).toBe(11);
    expect(calculateCategoryExpenseShare(110, 500)).toBe(22);
    expect(calculateSavingsGoalProgress(363, 700).progress).toBeCloseTo(
      51.8571,
      3,
    );
    expect(calculateSavingsGoalProgress(363, 700).remaining).toBe(337);
    expect(calculateSavingsRate([x("savings", 0)], "2026-09")).toBe(0);
    expect(
      calculateWealthBuildingRate(
        [x("income", 1000), x("savings", 100), x("investment", 50)],
        "2026-09",
      ),
    ).toBe(15);
  });
  it("distribuye el ingreso sin porcentajes inválidos", () => {
    const result = calculateIncomeDistribution(
      [x("income", 1000), x("deduction", 100)],
      [],
      "2026-09",
    );
    expect(result.find((item) => item.name === "Deducciones")?.percentage).toBe(
      10,
    );
    expect(calculateCategoryIncomeShare(100, 0)).toBe(0);
  });
});
describe("cálculos financieros", () => {
  it("calcula ingresos, deducciones y ahorro", () => {
    const transactions = [
      x("income", 1000),
      x("deduction", 100),
      x("expense", 300),
      x("savings", 200),
      x("investment", 100),
    ];
    expect(calculateIncome(transactions, "2026-09")).toBe(1000);
    expect(calculateDeductions(transactions, "2026-09")).toBe(100);
    expect(calculateSavings(transactions, "2026-09")).toBe(300);
    const s = summary(transactions, "2026-09");
    expect(s.available).toBe(300);
    expect(s.savingsRate).toBe(0.2);
  });
  it("separa gastos con y sin presupuesto sin duplicarlos", () => {
    const transactions = [
      transaction("1", "income", 5000, "income"),
      transaction("2", "deduction", 500, "deduction"),
      transaction("3", "expense", 1000, "food"),
      transaction("4", "expense", 700, "furniture"),
      transaction("5", "savings", 300, "save-1"),
    ];
    expect(calculateBudgetedExpenses(transactions, budgets, "2026-09")).toBe(
      1000,
    );
    expect(calculateUnbudgetedExpenses(transactions, budgets, "2026-09")).toBe(
      700,
    );
    expect(calculateTotalExpenses(transactions, budgets, "2026-09")).toBe(1700);
    expect(
      calculateBudgetScenarioAvailable(transactions, budgets, "2026-09"),
    ).toBe(3200);
    expect(calculateRealAvailable(transactions, budgets, "2026-09")).toBe(2500);
    expect(calculateRealAvailable(transactions, budgets, "2026-09")).toBe(
      calculateBudgetScenarioAvailable(transactions, budgets, "2026-09") - 700,
    );
  });
  it("no incluye deducciones ni deudas en el uso del límite", () => {
    const transactions = [
      transaction("1", "deduction", 400, "food"),
      transaction("2", "debt", 300, "food"),
    ];
    expect(calculateBudgetUsage(transactions, budgets, "2026-09")).toBe(0);
  });
  it("calcula presupuesto restante solo con límites definidos", () => {
    const transactions = [
      transaction("1", "expense", 250, "food"),
      transaction("2", "expense", 900, "furniture"),
    ];
    expect(calculateBudgetRemaining(transactions, budgets, "2026-09")).toBe(
      750,
    );
  });
  it("excluye deducciones y ordena el gráfico", () => {
    const transactions = [
      transaction("1", "expense", 100, "food"),
      transaction("2", "expense", 500, "furniture"),
      transaction("3", "deduction", 900, "deduction"),
    ];
    expect(
      calculateExpenseBreakdown(
        transactions,
        budgets,
        categories,
        "2026-09",
      ).map((row) => row.name),
    ).toEqual(["Amoblar", "Alimentación"]);
  });
  it("calcula gasto diario sin dividir por cero", () =>
    expect(
      calculateDailyAvailable(300, "2026-09", new Date("2026-09-23T12:00:00")),
    ).toEqual({ daysRemaining: 8, daily: 37.5 }));
  it("calcula presupuesto", () =>
    expect(budgetStatus(750, 1000)).toEqual({ percent: 75, remaining: 250 }));
});
