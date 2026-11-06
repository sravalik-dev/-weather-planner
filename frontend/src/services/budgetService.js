
import { apiRequest } from "../utils/apiUtils";

const json = (method, body) => ({
  method,
  body: JSON.stringify(body),
});

// ==========================================
// BUDGET OVERVIEW
// ==========================================

export const getBudgetOverview = (tripId) =>
  apiRequest(`/budgets/trips/${encodeURIComponent(tripId)}`);

export const createTripBudget = (payload) =>
  apiRequest("/budgets", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const updateTripBudget = (tripId, payload) =>
  apiRequest(
    `/budgets/trips/${encodeURIComponent(tripId)}`,
    json("PUT", payload)
  );

// ==========================================
// CATEGORY AND DAILY BUDGETS
// ==========================================

export const saveCategoryBudget = (tripId, payload) =>
  apiRequest(
    `/budgets/trips/${encodeURIComponent(tripId)}/categories`,
    json("POST", payload)
  );

export const saveDailyBudget = (tripId, payload) =>
  apiRequest(
    `/budgets/trips/${encodeURIComponent(tripId)}/daily`,
    json("POST", payload)
  );

// ==========================================
// EXPENSE MANAGEMENT
// ==========================================

export const getExpenses = (tripId) =>
  apiRequest(`/expenses/trips/${encodeURIComponent(tripId)}`);

export const createExpense = (payload) =>
  apiRequest("/expenses", json("POST", payload));

export const updateExpense = (tripId, expenseId, payload) =>
  apiRequest(
    `/expenses/trips/${encodeURIComponent(tripId)}/${encodeURIComponent(expenseId)}`,
    json("PUT", payload)
  );

export const deleteExpense = (tripId, expenseId) =>
  apiRequest(
    `/expenses/trips/${encodeURIComponent(tripId)}/${encodeURIComponent(expenseId)}`,
    {
      method: "DELETE",
    }
  );

// ==========================================
// GROUP MANAGEMENT
// ==========================================

export const getTripGroup = (tripId) =>
  apiRequest(`/budget/groups/trips/${encodeURIComponent(tripId)}`);

export const createTripGroup = (tripId, groupName) =>
  apiRequest(
    `/budget/groups/trips/${encodeURIComponent(tripId)}`,
    json("POST", { groupName })
  );

export const getGroupMembers = (groupId) =>
  apiRequest(`/budget/groups/${encodeURIComponent(groupId)}/members`);

export const addGroupMember = (groupId, userId) =>
  apiRequest(
    `/budget/groups/${encodeURIComponent(groupId)}/members`,
    json("POST", { userId: Number(userId) })
  );

export const removeGroupMember = (groupId, memberUserId) =>
  apiRequest(
    `/budget/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(memberUserId)}`,
    {
      method: "DELETE",
    }
  );

// ==========================================
// SETTLEMENTS
// ==========================================

export const getSettlements = (groupId) =>
  apiRequest(`/budget/groups/${encodeURIComponent(groupId)}/settlements`);

export const createSettlement = (groupId, payload) =>
  apiRequest(
    `/budget/groups/${encodeURIComponent(groupId)}/settlements`,
    json("POST", payload)
  );

export const completeSettlement = (groupId, settlementId) =>
  apiRequest(
    `/budget/groups/${encodeURIComponent(groupId)}/settlements/${encodeURIComponent(settlementId)}/complete`,
    {
      method: "PUT",
    }
  );

// ==========================================
// BUDGET HISTORY
// ==========================================

export const getBudgetHistory = (tripId) =>
  apiRequest(`/budget-history/trips/${encodeURIComponent(tripId)}`);
