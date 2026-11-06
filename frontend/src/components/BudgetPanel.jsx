
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "../styles/BudgetPlanner.css";

import {
  addGroupMember,
  completeSettlement,
  createExpense,
  createSettlement,
  createTripBudget,
  createTripGroup,
  deleteExpense,
  getBudgetHistory,
  getBudgetOverview,
  getExpenses,
  getGroupMembers,
  getSettlements,
  getTripGroup,
  saveCategoryBudget,
  saveDailyBudget,
  updateExpense,
  updateTripBudget,
} from "../services/budgetService";

const CATEGORIES = [
  { value: "ACCOMMODATION", label: "Stay & hotels", icon: "⌂", color: "violet" },
  { value: "TRANSPORTATION", label: "Transport", icon: "↗", color: "blue" },
  { value: "FOOD", label: "Food & dining", icon: "◒", color: "orange" },
  { value: "ATTRACTIONS_AND_TICKETS", label: "Tickets & sights", icon: "✦", color: "pink" },
  { value: "SHOPPING", label: "Shopping", icon: "◇", color: "yellow" },
  { value: "ACTIVITIES", label: "Activities", icon: "◎", color: "green" },
  { value: "OTHER", label: "Other", icon: "•••", color: "slate" },
];

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  })}`;

const today = () => {
  const date = new Date();
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

const niceDate = (value) => {
  if (!value) return "Date not set";

  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);

  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
};

const niceCategory = (value) =>
  CATEGORIES.find((item) => item.value === value)?.label ||
  String(value || "Other").replaceAll("_", " ").toLowerCase();

const initials = (name) =>
  String(name || "T")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

function Modal({
  title,
  subtitle,
  onClose,
  children,
  wide = false,
  error = "",
}) {
  return (
    <div
      className="bp-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className={`bp-modal ${wide ? "bp-modal-wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="bp-modal-head">
          <div>
            <span className="bp-kicker">TRIP FINANCE STUDIO</span>
            <h2>{title}</h2>
            {subtitle ? <p>{subtitle}</p> : null}
            {error ? <div className="bp-modal-error">{error}</div> : null}
          </div>

          <button
            type="button"
            className="bp-icon-button"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {children}
      </section>
    </div>
  );
}

function BudgetPanel({
  trips = [],
  selectedTripId: parentTripId = "",
  onTripChange,
  tripsLoading = false,
}) {
  const safeTrips = Array.isArray(trips) ? trips : [];

  const [tripId, setTripId] = useState(parentTripId || "");
  const [activeTab, setActiveTab] = useState("overview");

  const [overview, setOverview] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [history, setHistory] = useState([]);

  const [loading, setLoading] = useState(false);
  const [creatingBudget, setCreatingBudget] = useState(false);
  const [groupMissing, setGroupMissing] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [modal, setModal] = useState("");
  const [busy, setBusy] = useState(false);

  const requestIdRef = useRef(0);

  const [budgetForm, setBudgetForm] = useState({
    totalBudget: "",
    warningThreshold: "85",
  });

  const [expenseForm, setExpenseForm] = useState({
    category: "FOOD",
    description: "",
    amount: "",
    expenseDate: today(),
    splitType: "EQUAL",
    paymentMethod: "UPI",
    shares: {},
  });

  const [categoryForm, setCategoryForm] = useState({
    category: "ACCOMMODATION",
    allocatedAmount: "",
  });

  const [dailyForm, setDailyForm] = useState({
    budgetDate: today(),
    dailyLimit: "",
  });

  const [groupName, setGroupName] = useState("");
  const [newMemberId, setNewMemberId] = useState("");

  const [settlementForm, setSettlementForm] = useState({
    payerMemberId: "",
    receiverMemberId: "",
    amount: "",
  });

  const [editingExpense, setEditingExpense] = useState(null);

  const selectedTrip = useMemo(
    () =>
      safeTrips.find(
        (trip) =>
          String(trip.tripId ?? trip.id) === String(tripId)
      ),
    [safeTrips, tripId]
  );

  const totalBudget = Number(overview?.totalBudget || 0);
  const totalSpent = Number(overview?.totalSpent || 0);

  const remaining = Number(
    overview?.remainingBudget ??
      Math.max(totalBudget - totalSpent, 0)
  );

  const spentPercent = Math.max(
    0,
    Math.min(100, Number(overview?.spentPercentage || 0))
  );

  const isOverBudget =
    Boolean(overview?.overspending) || totalSpent > totalBudget;

  // --------------------------------------------------
  // LOAD ALL DATA FOR THE SELECTED TRIP
  // --------------------------------------------------

  const loadData = useCallback(
    async (selectedId, quiet = false) => {
      if (!selectedId) return;

      const currentRequestId = ++requestIdRef.current;

      const isCurrentRequest = () =>
        requestIdRef.current === currentRequestId;

      if (!quiet) {
        setLoading(true);
      }

      setError("");
      setNotice("");

      try {
        const [budgetResult, expenseResult, historyResult] =
          await Promise.allSettled([
            getBudgetOverview(selectedId),
            getExpenses(selectedId),
            getBudgetHistory(selectedId),
          ]);

        if (!isCurrentRequest()) return;

        if (budgetResult.status === "fulfilled") {
          setOverview(budgetResult.value);

          setBudgetForm({
            totalBudget: String(
              budgetResult.value.totalBudget ?? ""
            ),
            warningThreshold: String(
              budgetResult.value.warningThreshold ?? 85
            ),
          });

          setCreatingBudget(false);
        } else if (
          budgetResult.reason?.status === 404 ||
          /budget not found/i.test(
            budgetResult.reason?.message || ""
          )
        ) {
          setOverview(null);
          setCreatingBudget(true);

          setBudgetForm({
            totalBudget: String(selectedTrip?.budget || ""),
            warningThreshold: "85",
          });
        } else {
          throw budgetResult.reason;
        }

        const loadedExpenses =
          expenseResult.status === "fulfilled" &&
          Array.isArray(expenseResult.value)
            ? expenseResult.value
            : [];

        setExpenses(loadedExpenses);

        setHistory(
          historyResult.status === "fulfilled" &&
            Array.isArray(historyResult.value)
            ? historyResult.value
            : []
        );

        try {
          const groupResult = await getTripGroup(selectedId);

          if (!isCurrentRequest()) return;

          setGroup(groupResult);
          setGroupMissing(false);

          const [memberResult, settlementResult] =
            await Promise.all([
              getGroupMembers(groupResult.groupId),
              getSettlements(groupResult.groupId),
            ]);

          if (!isCurrentRequest()) return;

          const namesByUserId = {};

          loadedExpenses.forEach((expense) =>
            (expense.splits || []).forEach((split) => {
              if (
                split.memberUserId != null &&
                split.memberName
              ) {
                namesByUserId[split.memberUserId] =
                  split.memberName;
              }
            })
          );

          setMembers(
            Array.isArray(memberResult)
              ? memberResult.map((member) => ({
                  ...member,
                  memberName:
                    namesByUserId[member.userId] ||
                    member.memberName,
                }))
              : []
          );

          setSettlements(
            Array.isArray(settlementResult)
              ? settlementResult
              : []
          );
        } catch (groupError) {
          if (!isCurrentRequest()) return;

          if (
            groupError?.status === 404 ||
            /no group exists/i.test(
              groupError?.message || ""
            )
          ) {
            setGroup(null);
            setMembers([]);
            setSettlements([]);
            setGroupMissing(true);
          } else {
            throw groupError;
          }
        }
      } catch (loadError) {
        if (!isCurrentRequest()) return;

        setError(
          loadError.message ||
            "Unable to load budget information."
        );
      } finally {
        if (isCurrentRequest() && !quiet) {
          setLoading(false);
        }
      }
    },
    [selectedTrip]
  );

  // --------------------------------------------------
  // SYNCHRONIZE TRIP SELECTION WITH APPSHELL
  // --------------------------------------------------

  useEffect(() => {
    if (tripsLoading) return;

    if (!safeTrips.length) {
      setTripId("");
      return;
    }

    const validParentTrip = safeTrips.find(
      (trip) =>
        String(trip.tripId ?? trip.id) ===
        String(parentTripId)
    );

    const validCurrentTrip = safeTrips.find(
      (trip) =>
        String(trip.tripId ?? trip.id) ===
        String(tripId)
    );

    // Prefer the parent selection.
    // Otherwise preserve the current valid selection.
    // If neither exists, prefer Trip56.
    // Finally, use the first available trip.
    const preferredTrip =
      validParentTrip ||
      validCurrentTrip ||
      safeTrips.find(
        (trip) =>
          String(trip.tripId ?? trip.id) === "56"
      ) ||
      safeTrips[0];

    const nextTripId = String(
      preferredTrip.tripId ?? preferredTrip.id
    );

    setTripId((current) =>
      current === nextTripId ? current : nextTripId
    );

    if (String(parentTripId) !== nextTripId) {
      onTripChange?.(nextTripId);
    }
  }, [
    safeTrips,
    parentTripId,
    tripsLoading,
    onTripChange,
    tripId,
  ]);

  // --------------------------------------------------
  // FETCH DATA WHEN TRIP CHANGES
  // --------------------------------------------------

  useEffect(() => {
    if (!tripId || tripsLoading) return;

    loadData(tripId);

    return () => {
      // Invalidate any older request when switching trips.
      requestIdRef.current += 1;
    };
  }, [tripId, tripsLoading, loadData]);

  const refresh = async (message = "") => {
    if (!tripId) return;

    await loadData(tripId, true);

    if (message) {
      setNotice(message);
    }
  };

  // --------------------------------------------------
  // CREATE BUDGET
  // --------------------------------------------------

  const handleCreateBudget = async (event) => {
    event.preventDefault();

    const amount = Number(budgetForm.totalBudget);
    const threshold = Number(budgetForm.warningThreshold);

    if (!Number.isFinite(amount) || amount <= 0) {
      return setError(
        "Enter a total budget greater than zero."
      );
    }

    if (
      !Number.isInteger(threshold) ||
      threshold < 1 ||
      threshold > 100
    ) {
      return setError(
        "Warning threshold must be between 1 and 100."
      );
    }

    setBusy(true);
    setError("");

    try {
      await createTripBudget({
        tripId: Number(tripId),
        totalBudget: amount,
        warningThreshold: threshold,
      });

      await refresh("Your trip budget is ready.");
    } catch (requestError) {
      setError(
        requestError.message ||
          "Could not create the budget."
      );
    } finally {
      setBusy(false);
    }
  };

  // --------------------------------------------------
  // UPDATE BUDGET
  // --------------------------------------------------

  const handleUpdateBudget = async (event) => {
    event.preventDefault();

    const amount = Number(budgetForm.totalBudget);
    const threshold = Number(budgetForm.warningThreshold);

    if (!Number.isFinite(amount) || amount <= 0) {
      return setError("Enter a valid total budget.");
    }

    if (
      !Number.isInteger(threshold) ||
      threshold < 1 ||
      threshold > 100
    ) {
      return setError(
        "Warning threshold must be between 1 and 100."
      );
    }

    setBusy(true);
    setError("");

    try {
      await updateTripBudget(tripId, {
        totalBudget: amount,
        warningThreshold: threshold,
      });

      setModal("");
      await refresh("Budget settings updated.");
    } catch (requestError) {
      setError(
        requestError.message ||
          "Could not update the budget."
      );
    } finally {
      setBusy(false);
    }
  };

  // --------------------------------------------------
  // EXPENSE FORMS
  // --------------------------------------------------

  const openNewExpense = () => {
    setEditingExpense(null);

    setExpenseForm({
      category: "FOOD",
      description: "",
      amount: "",
      expenseDate: today(),
      splitType: "EQUAL",
      paymentMethod: "UPI",
      shares: {},
    });

    setModal("expense");
  };

  const openEditExpense = (expense) => {
    setEditingExpense(expense);

    setExpenseForm({
      category: expense.category || "OTHER",
      description: expense.description || "",
      amount: String(expense.amount || ""),
      expenseDate: expense.expenseDate || today(),
      splitType: expense.splitType || "EQUAL",
      paymentMethod: expense.paymentMethod || "UPI",
      shares: {},
    });

    setModal("expense");
  };

  const handleSaveExpense = async (event) => {
    event.preventDefault();

    const amount = Number(expenseForm.amount);

    if (!expenseForm.description.trim()) {
      return setError(
        "Add a short description for this expense."
      );
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return setError(
        "Enter an expense amount greater than zero."
      );
    }

    if (
      group &&
      expenseForm.splitType !== "EQUAL" &&
      !editingExpense
    ) {
      const values = members.map((member) =>
        Number(expenseForm.shares[member.userId] || 0)
      );

      const sum = values.reduce(
        (total, value) => total + value,
        0
      );

      if (
        expenseForm.splitType === "CUSTOM" &&
        Math.abs(sum - amount) > 0.01
      ) {
        return setError(
          "Custom shares must add up to the expense amount."
        );
      }

      if (
        expenseForm.splitType === "PERCENTAGE" &&
        Math.abs(sum - 100) > 0.01
      ) {
        return setError(
          "Percentages must add up to 100%."
        );
      }
    }

    setBusy(true);
    setError("");

    try {
      if (editingExpense) {
        await updateExpense(
          tripId,
          editingExpense.expenseId,
          {
            category: expenseForm.category,
            description: expenseForm.description.trim(),
            amount,
            expenseDate: expenseForm.expenseDate,
            splitType: expenseForm.splitType,
            paymentMethod: expenseForm.paymentMethod,
          }
        );
      } else {
        const payload = {
          tripId: Number(tripId),
          groupId: group?.groupId ?? null,
          category: expenseForm.category,
          description: expenseForm.description.trim(),
          amount,
          expenseDate: expenseForm.expenseDate,
          splitType: group
            ? expenseForm.splitType
            : null,
          paymentMethod: expenseForm.paymentMethod,
        };

        if (
          group &&
          expenseForm.splitType !== "EQUAL"
        ) {
          payload.splits = members.map((member) => ({
            memberUserId: Number(member.userId),

            ...(expenseForm.splitType === "CUSTOM"
              ? {
                  shareAmount: Number(
                    expenseForm.shares[member.userId] || 0
                  ),
                }
              : {
                  percentage: Number(
                    expenseForm.shares[member.userId] || 0
                  ),
                }),
          }));
        }

        await createExpense(payload);
      }

      setModal("");

      await refresh(
        editingExpense
          ? "Expense updated successfully."
          : "Expense added to your trip."
      );
    } catch (requestError) {
      setError(
        requestError.message ||
          "Could not save this expense."
      );
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteExpense = async (expense) => {
    if (
      !window.confirm(
        `Delete “${expense.description}”? This will recalculate group balances.`
      )
    ) {
      return;
    }

    setBusy(true);
    setError("");

    try {
      await deleteExpense(tripId, expense.expenseId);

      await refresh(
        "Expense deleted and balances recalculated."
      );
    } catch (requestError) {
      setError(
        requestError.message ||
          "Could not delete the expense."
      );
    } finally {
      setBusy(false);
    }
  };

  // --------------------------------------------------
  // CATEGORY BUDGET
  // --------------------------------------------------

  const handleSaveCategory = async (event) => {
    event.preventDefault();

    const amount = Number(categoryForm.allocatedAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return setError(
        "Enter an allocation greater than zero."
      );
    }

    setBusy(true);
    setError("");

    try {
      await saveCategoryBudget(tripId, {
        category: categoryForm.category,
        allocatedAmount: amount,
      });

      setModal("");
      await refresh("Category allocation saved.");
    } catch (requestError) {
      setError(
        requestError.message ||
          "Could not save category allocation."
      );
    } finally {
      setBusy(false);
    }
  };

  // --------------------------------------------------
  // DAILY BUDGET
  // --------------------------------------------------

  const handleSaveDaily = async (event) => {
    event.preventDefault();

    const amount = Number(dailyForm.dailyLimit);

    if (
      !dailyForm.budgetDate ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return setError(
        "Choose a date and enter a daily limit."
      );
    }

    setBusy(true);
    setError("");

    try {
      await saveDailyBudget(tripId, {
        budgetDate: dailyForm.budgetDate,
        dailyLimit: amount,
      });

      setModal("");
      await refresh("Daily limit saved.");
    } catch (requestError) {
      setError(
        requestError.message ||
          "Could not save daily limit."
      );
    } finally {
      setBusy(false);
    }
  };

  // --------------------------------------------------
  // GROUP MANAGEMENT
  // --------------------------------------------------

  const handleCreateGroup = async (event) => {
    event.preventDefault();

    if (!groupName.trim()) {
      return setError(
        "Enter a name for your travel group."
      );
    }

    setBusy(true);
    setError("");

    try {
      await createTripGroup(tripId, groupName.trim());

      setGroupName("");
      setModal("");

      await refresh(
        "Your trip group has been created."
      );
    } catch (requestError) {
      setError(
        requestError.message || "Could not create group."
      );
    } finally {
      setBusy(false);
    }
  };

  const handleAddMember = async (event) => {
    event.preventDefault();

    if (!/^\d+$/.test(newMemberId.trim())) {
      return setError(
        "Enter the registered user's numeric ID."
      );
    }

    setBusy(true);
    setError("");

    try {
      await addGroupMember(
        group.groupId,
        Number(newMemberId)
      );

      setNewMemberId("");
      setModal("");

      await refresh(
        "Member added to your trip group."
      );
    } catch (requestError) {
      setError(
        requestError.message ||
          "Could not add this member."
      );
    } finally {
      setBusy(false);
    }
  };

  // --------------------------------------------------
  // SETTLEMENTS
  // --------------------------------------------------

  
  // --------------------------------------------------
  // SETTLEMENTS
  // --------------------------------------------------

  const handleCreateSettlement = async (event) => {
    event.preventDefault();

    if (!group?.groupId) {
      setError("No group is selected. Please refresh and try again.");
      return;
    }

    const payerMemberId = Number(
      settlementForm.payerMemberId
    );

    const receiverMemberId = Number(
      settlementForm.receiverMemberId
    );

    const amount = Number(settlementForm.amount);

    // Validate the form.
    if (
      !Number.isInteger(payerMemberId) ||
      payerMemberId <= 0 ||
      !Number.isInteger(receiverMemberId) ||
      receiverMemberId <= 0 ||
      payerMemberId === receiverMemberId
    ) {
      setError("Choose two different group members.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a valid settlement amount greater than zero.");
      return;
    }

    // Confirm that both members belong to the selected group.
    const payerExists = members.some(
      (member) =>
        Number(member.memberId) === payerMemberId
    );

    const receiverExists = members.some(
      (member) =>
        Number(member.memberId) === receiverMemberId
    );

    if (!payerExists || !receiverExists) {
      setError("Selected group members could not be found. Refresh and try again.");
      return;
    }

    setBusy(true);
    setError("");
    setNotice("");

    try {
      // Create the pending settlement.
      await createSettlement(group.groupId, {
        payerMemberId,
        receiverMemberId,
        amount,
      });

      // Clear the form and close the modal.
      setSettlementForm({
        payerMemberId: "",
        receiverMemberId: "",
        amount: "",
      });

      setModal("");

      // Reload settlements and member balances.
      await loadData(tripId, true);

      setNotice("Settlement recorded successfully.");
    } catch (requestError) {
      setError(
        requestError.message ||
          "Unable to record settlement. Please try again."
      );
    } finally {
      setBusy(false);
    }
  };

  // --------------------------------------------------
  // COMPLETE / MARK SETTLEMENT AS PAID
  // --------------------------------------------------

  const handleCompleteSettlement = async (settlementId) => {
    if (!group?.groupId) {
      setError("Group information is missing.");
      return;
    }

    if (!settlementId) {
      setError("Settlement information is missing.");
      return;
    }

    setBusy(true);
    setError("");
    setNotice("");

    try {
      await completeSettlement(
        group.groupId,
        Number(settlementId)
      );

      // Reload the latest settlement statuses and balances.
      await loadData(tripId, true);

      setNotice("Settlement marked as paid successfully.");
    } catch (requestError) {
      setError(
        requestError.message ||
          "Unable to complete settlement. Please try again."
      );
    } finally {
      setBusy(false);
    }
  };

  // --------------------------------------------------
  // DERIVED DATA
  // --------------------------------------------------

  const memberLabel = (member) =>
    member.memberName ||
    member.name ||
    `Traveler #${member.userId}`;

  const memberById = (memberId) =>
    members.find(
      (member) =>
        Number(member.memberId) === Number(memberId)
    );

  const categoryRows = overview?.categoryBudgets || [];
  const dailyRows = overview?.dailyBudgets || [];

  const pendingSettlements = settlements.filter(
    (item) => item.status === "PENDING"
  );

  const paidSettlements = settlements.filter(
    (item) => item.status === "COMPLETED"
  );

  const categorySpend = useMemo(() => {
    const result = {};

    expenses.forEach((expense) => {
      result[expense.category] =
        (result[expense.category] || 0) +
        Number(expense.amount || 0);
    });

    return result;
  }, [expenses]);

  // --------------------------------------------------
  // EMPTY STATES
  // --------------------------------------------------

  if (tripsLoading) {
    return (
      <div className="bp-page">
        <div className="bp-loading">
          <span className="bp-spinner" />
          Loading your trips…
        </div>
      </div>
    );
  }

  if (!safeTrips.length) {
    return (
      <div className="bp-page">
        <div className="bp-empty-state">
          <div className="bp-empty-orbit">₹</div>
          <span className="bp-kicker">
            YOUR TRIP FINANCE STUDIO
          </span>
          <h1>
            Every great trip has a plan.
            <br />
            <em>Make room for the memories.</em>
          </h1>
          <p>
            Create a trip first. Your budget, expenses and
            shared costs will live here together.
          </p>
        </div>
      </div>
    );
  }

  // --------------------------------------------------
  // MAIN UI
  // --------------------------------------------------

  return (
    <div className="bp-page">
      <div className="bp-page-head">
        <div>
          <span className="bp-kicker">
            THE MONEY SIDE OF THE JOURNEY
          </span>
          <h1>
            Budget <em>atelier.</em>
          </h1>
          <p>
            A clearer view of every rupee, from the first
            booking to the final goodbye.
          </p>
        </div>

        <div className="bp-trip-picker">
          <span>WORKSPACE</span>

          <select
            value={tripId}
            onChange={(event) => {
              const nextTripId = event.target.value;

              setTripId(nextTripId);
              onTripChange?.(nextTripId);
            }}
            aria-label="Choose trip"
          >
            {safeTrips.map((trip) => (
              <option
                key={trip.tripId ?? trip.id}
                value={String(trip.tripId ?? trip.id)}
              >
                {trip.tripName ||
                  trip.destination ||
                  `Trip ${trip.tripId ?? trip.id}`}
              </option>
            ))}
          </select>

          <span className="bp-picker-mark">⌄</span>
        </div>
      </div>

      {error ? (
        <div className="bp-alert bp-alert-error">
          <span>!</span>
          {error}
          <button
            type="button"
            onClick={() => setError("")}
          >
            ×
          </button>
        </div>
      ) : null}

      {notice ? (
        <div className="bp-alert bp-alert-success">
          <span>✓</span>
          {notice}
          <button
            type="button"
            onClick={() => setNotice("")}
          >
            ×
          </button>
        </div>
      ) : null}

      {loading ? (
        <div className="bp-loading">
          <span className="bp-spinner" />
          Preparing your trip finances…
        </div>
      ) : creatingBudget ? (
        <section className="bp-create-budget">
          <div className="bp-create-art">
            <div className="bp-art-ring ring-one" />
            <div className="bp-art-ring ring-two" />
            <span>₹</span>
            <small>TRIP FUND</small>
          </div>

          <div className="bp-create-copy">
            <span className="bp-kicker">A FRESH START</span>

            <h2>
              Give this journey
              <br />
              <em>a number to work with.</em>
            </h2>

            <p>
              Set your trip budget to unlock spending
              insights, category limits, daily guardrails
              and expense tracking.
            </p>

            <form
              className="bp-inline-form"
              onSubmit={handleCreateBudget}
            >
              <label>
                <span>Total trip budget</span>
                <div className="bp-money-input">
                  <b>₹</b>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={budgetForm.totalBudget}
                    onChange={(event) =>
                      setBudgetForm((current) => ({
                        ...current,
                        totalBudget: event.target.value,
                      }))
                    }
                    placeholder="25000"
                    required
                  />
                </div>
              </label>

              <label className="bp-threshold-field">
                <span>Alert me at</span>
                <div className="bp-money-input">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    step="1"
                    value={budgetForm.warningThreshold}
                    onChange={(event) =>
                      setBudgetForm((current) => ({
                        ...current,
                        warningThreshold: event.target.value,
                      }))
                    }
                    required
                  />
                  <b>%</b>
                </div>
              </label>

              <button
                className="bp-button bp-button-dark"
                disabled={busy}
              >
                {busy ? "Creating…" : "Create my budget ↗"}
              </button>
            </form>
          </div>
        </section>
      ) : overview ? (
        <>
          <section className="bp-hero">
            <div className="bp-hero-topline">
              <div className="bp-trip-label">
                <span className="bp-live-dot" />
                LIVE TRIP BUDGET
                <span className="bp-dot-sep">·</span>
                {selectedTrip?.destination ||
                  selectedTrip?.tripName ||
                  "Selected trip"}
              </div>

              <button
                type="button"
                className="bp-hero-settings"
                onClick={() => setModal("budget")}
              >
                ↗ <span>Budget settings</span>
              </button>
            </div>

            <div className="bp-hero-grid">
              <div className="bp-hero-main">
                <span className="bp-hero-caption">
                  YOU STILL HAVE
                </span>

                <div className="bp-remaining-value">
                  {money(remaining)}
                </div>

                <div className="bp-hero-sub">
                  of {money(totalBudget)} available for this
                  journey
                </div>

                <div className="bp-progress-track">
                  <span style={{ width: `${spentPercent}%` }} />
                </div>

                <div className="bp-progress-meta">
                  <span>{money(totalSpent)} spent</span>
                  <strong>
                    {spentPercent.toFixed(1)}% used
                  </strong>
                  <span>{money(totalBudget)} planned</span>
                </div>
              </div>

              <div className="bp-hero-side">
                <div
                  className="bp-orbit-chart"
                  style={{
                    "--bp-progress": `${spentPercent}%`,
                  }}
                >
                  <div>
                    <strong>
                      {Math.round(spentPercent)}
                      <small>%</small>
                    </strong>
                    <span>UTILISED</span>
                  </div>
                </div>

                <div className="bp-health-note">
                  <span
                    className={
                      isOverBudget
                        ? "bp-health-icon danger"
                        : "bp-health-icon"
                    }
                  >
                    {isOverBudget ? "!" : "✓"}
                  </span>

                  <div>
                    <strong>
                      {isOverBudget
                        ? "Over budget"
                        : "Looking balanced"}
                    </strong>
                    <small>
                      {isOverBudget
                        ? "Review your recent spending"
                        : `Your ${
                            overview.warningThreshold || 85
                          }% alert is active`}
                    </small>
                  </div>
                </div>
              </div>
            </div>

            <div className="bp-hero-footer">
              <span>
                ✦ &nbsp; A little planning goes a long way.
              </span>
              <span>Budget ID #{overview.budgetId}</span>
            </div>
          </section>

          <section className="bp-stat-grid">
            <article className="bp-stat-card">
              <div className="bp-stat-icon spent">↗</div>
              <div>
                <span>TOTAL SPENT</span>
                <strong>{money(totalSpent)}</strong>
                <small>
                  Across {expenses.length} recorded{" "}
                  {expenses.length === 1
                    ? "expense"
                    : "expenses"}
                </small>
              </div>
              <i className="bp-stat-spark">⌁</i>
            </article>

            <article className="bp-stat-card">
              <div className="bp-stat-icon left">◷</div>
              <div>
                <span>AVAILABLE BALANCE</span>
                <strong>{money(remaining)}</strong>
                <small>
                  {totalBudget > 0
                    ? `${Math.max(
                        0,
                        (remaining / totalBudget) * 100
                      ).toFixed(1)}% of your fund remains`
                    : "Set a budget to begin"}
                </small>
              </div>
              <i className="bp-stat-spark">⌁</i>
            </article>

            <article className="bp-stat-card">
              <div className="bp-stat-icon people">♧</div>
              <div>
                <span>TRAVEL COMPANIONS</span>
                <strong>{group ? members.length : "—"}</strong>
                <small>
                  {group
                    ? group.groupName
                    : "No group linked yet"}
                </small>
              </div>
              <i className="bp-stat-spark">⌁</i>
            </article>

            <article className="bp-stat-card">
              <div className="bp-stat-icon alert">◎</div>
              <div>
                <span>SPENDING ALERT</span>
                <strong>
                  {overview.warningThreshold || 85}%
                </strong>
                <small>
                  {isOverBudget
                    ? "Budget exceeded"
                    : "Your warning threshold"}
                </small>
              </div>
              <i className="bp-stat-spark">⌁</i>
            </article>
          </section>

          <div className="bp-tabbar" role="tablist" aria-label="Budget sections">
            {[
              ["overview", "Overview", "▦"],
              ["expenses", "Expenses", "↗"],
              ["groups", "Group wallet", "♧"],
              ["activity", "Activity", "◷"],
            ].map(([id, label, icon]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={activeTab === id}
                className={activeTab === id ? "active" : ""}
                onClick={() => setActiveTab(id)}
              >
                <span>{icon}</span>
                {label}
                {id === "expenses" ? (
                  <small>{expenses.length}</small>
                ) : null}
              </button>
            ))}

            <div className="bp-tab-actions">
              <button
                type="button"
                className="bp-button bp-button-soft"
                onClick={() => setModal("category")}
              >
                ＋ Category limit
              </button>

              <button
                type="button"
                className="bp-button bp-button-dark"
                onClick={openNewExpense}
              >
                ＋ Add expense
              </button>
            </div>
          </div>

          {activeTab === "overview" ? (
            <div className="bp-content-grid">
              <section className="bp-panel bp-spend-panel">
                <div className="bp-panel-head">
                  <div>
                    <span className="bp-kicker">WHERE IT GOES</span>
                    <h2>Spending map</h2>
                    <p>
                      See how your trip fund is distributed.
                    </p>
                  </div>
                  <span className="bp-panel-count">
                    {categoryRows.length} LIMITS
                  </span>
                </div>

                {categoryRows.length ? (
                  <div className="bp-category-list">
                    {categoryRows.map((row) => {
                      const meta =
                        CATEGORIES.find(
                          (item) =>
                            item.value === row.category
                        ) || CATEGORIES[6];

                      const spent = Number(
                        row.spentAmount ??
                          categorySpend[row.category] ??
                          0
                      );

                      const allocated = Number(
                        row.allocatedAmount || 0
                      );

                      const percent =
                        allocated > 0
                          ? Math.min(
                              100,
                              (spent / allocated) * 100
                            )
                          : 0;

                      return (
                        <div
                          className="bp-category-row"
                          key={
                            row.categoryBudgetId ||
                            row.category
                          }
                        >
                          <div
                            className={`bp-category-symbol ${meta.color}`}
                          >
                            {meta.icon}
                          </div>

                          <div className="bp-category-info">
                            <div className="bp-category-title">
                              <strong>{meta.label}</strong>
                              <span>
                                {money(spent)}{" "}
                                <small>
                                  / {money(allocated)}
                                </small>
                              </span>
                            </div>

                            <div className="bp-mini-track">
                              <span
                                className={meta.color}
                                style={{
                                  width: `${percent}%`,
                                }}
                              />
                            </div>

                            <small>
                              {money(
                                Math.max(
                                  0,
                                  allocated - spent
                                )
                              )}{" "}
                              left in this category
                            </small>
                          </div>

                          <b className="bp-category-percent">
                            {percent.toFixed(0)}%
                          </b>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bp-inline-empty">
                    <span>◌</span>
                    <strong>No category limits yet</strong>
                    <p>
                      Give accommodation, food or transport
                      its own spending lane.
                    </p>
                    <button
                      type="button"
                      onClick={() => setModal("category")}
                    >
                      Create a category limit ↗
                    </button>
                  </div>
                )}
              </section>

              <section className="bp-panel bp-daily-panel">
                <div className="bp-panel-head">
                  <div>
                    <span className="bp-kicker">
                      DAY BY DAY
                    </span>
                    <h2>Daily guardrails</h2>
                    <p>
                      Keep each day comfortably on track.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="bp-small-add"
                    onClick={() => setModal("daily")}
                  >
                    ＋ Add day
                  </button>
                </div>

                {dailyRows.length ? (
                  <div className="bp-daily-list">
                    {dailyRows.slice(0, 5).map((row) => {
                      const spent = Number(
                        row.spentAmount || 0
                      );
                      const limit = Number(
                        row.dailyLimit || 0
                      );

                      const percent =
                        limit > 0
                          ? Math.min(
                              100,
                              (spent / limit) * 100
                            )
                          : 0;

                      return (
                        <div
                          className="bp-daily-row"
                          key={
                            row.dailyBudgetId ||
                            row.budgetDate
                          }
                        >
                          <div className="bp-calendar-tile">
                            <b>
                              {new Date(
                                `${row.budgetDate}T00:00:00`
                              ).getDate()}
                            </b>
                            <small>
                              {new Date(
                                `${row.budgetDate}T00:00:00`
                              ).toLocaleDateString("en-IN", {
                                month: "short",
                              })}
                            </small>
                          </div>

                          <div className="bp-daily-info">
                            <div>
                              <strong>
                                {niceDate(row.budgetDate)}
                              </strong>
                              <span>
                                {money(spent)} / {money(limit)}
                              </span>
                            </div>

                            <div className="bp-mini-track">
                              <span
                                className="daily"
                                style={{
                                  width: `${percent}%`,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bp-inline-empty compact">
                    <span>◷</span>
                    <strong>No daily limits set</strong>
                    <p>
                      Set a daily cap for your travel dates.
                    </p>
                    <button
                      type="button"
                      onClick={() => setModal("daily")}
                    >
                      Add your first day ↗
                    </button>
                  </div>
                )}
              </section>

              <section className="bp-panel bp-recent-panel">
                <div className="bp-panel-head">
                  <div>
                    <span className="bp-kicker">
                      FRESH FROM THE ROAD
                    </span>
                    <h2>Recent expenses</h2>
                  </div>

                  <button
                    type="button"
                    className="bp-text-button"
                    onClick={() => setActiveTab("expenses")}
                  >
                    All expenses ↗
                  </button>
                </div>

                {expenses.length ? (
                  <div className="bp-recent-list">
                    {expenses.slice(0, 4).map((expense) => (
                      <ExpenseRow
                        key={expense.expenseId}
                        expense={expense}
                        onEdit={openEditExpense}
                        onDelete={handleDeleteExpense}
                        compact
                      />
                    ))}
                  </div>
                ) : (
                  <div className="bp-inline-empty compact">
                    <span>＋</span>
                    <strong>Your story starts here</strong>
                    <p>
                      Add your first expense to see the budget
                      come alive.
                    </p>
                    <button
                      type="button"
                      onClick={openNewExpense}
                    >
                      Add an expense ↗
                    </button>
                  </div>
                )}
              </section>

              <section className="bp-panel bp-group-teaser">
                <div className="bp-panel-head">
                  <div>
                    <span className="bp-kicker">
                      TRAVEL BETTER TOGETHER
                    </span>
                    <h2>Shared trip wallet</h2>
                    <p>
                      Keep group expenses and settlements fair.
                    </p>
                  </div>
                  <div className="bp-group-emblem">♧</div>
                </div>

                {group ? (
                  <>
                    <div className="bp-group-mini-meta">
                      <strong>{group.groupName}</strong>
                      <span>
                        {members.length} companions
                      </span>
                    </div>

                    <div className="bp-avatar-stack">
                      {members.slice(0, 5).map((member) => (
                        <span key={member.memberId}>
                          {initials(
                            member.memberName ||
                              `T${member.userId}`
                          )}
                        </span>
                      ))}
                    </div>

                    <div className="bp-group-bottom">
                      <span>
                        {pendingSettlements.length} pending
                        settlements
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveTab("groups")}
                      >
                        Open group wallet ↗
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="bp-group-empty">
                    <p>
                      {groupMissing
                        ? "Create a shared wallet for this trip and split costs with your companions."
                        : "Loading group wallet…"}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setGroupName(
                          selectedTrip?.tripName
                            ? `${selectedTrip.tripName} Group`
                            : "Trip Group"
                        );
                        setModal("group");
                      }}
                    >
                      Create a group wallet ↗
                    </button>
                  </div>
                )}
              </section>
            </div>
          ) : null}

          {activeTab === "expenses" ? (
            <section className="bp-panel bp-full-panel">
              <div className="bp-panel-head">
                <div>
                  <span className="bp-kicker">
                    THE RECEIPT ROLL
                  </span>
                  <h2>All expenses</h2>
                  <p>
                    Every booking, meal and little detour in
                    one place.
                  </p>
                </div>

                <button
                  type="button"
                  className="bp-button bp-button-dark"
                  onClick={openNewExpense}
                >
                  ＋ Add expense
                </button>
              </div>

              {expenses.length ? (
                <div className="bp-expense-table">
                  <div className="bp-expense-table-head">
                    <span>EXPENSE</span>
                    <span>CATEGORY</span>
                    <span>DATE</span>
                    <span>PAID BY</span>
                    <span>AMOUNT</span>
                    <span />
                  </div>

                  {expenses.map((expense) => (
                    <ExpenseRow
                      key={expense.expenseId}
                      expense={expense}
                      onEdit={openEditExpense}
                      onDelete={handleDeleteExpense}
                    />
                  ))}
                </div>
              ) : (
                <div className="bp-inline-empty">
                  <span>↗</span>
                  <strong>No expenses recorded</strong>
                  <p>
                    Start logging the costs that make this trip
                    yours.
                  </p>
                  <button
                    type="button"
                    onClick={openNewExpense}
                  >
                    Add your first expense ↗
                  </button>
                </div>
              )}
            </section>
          ) : null}

          {activeTab === "groups" ? (
            <div className="bp-content-grid bp-group-layout">
              <section className="bp-panel bp-group-panel">
                <div className="bp-panel-head">
                  <div>
                    <span className="bp-kicker">
                      THE SHARED WALLET
                    </span>
                    <h2>
                      {group?.groupName ||
                        "Your travel circle"}
                    </h2>
                    <p>
                      {group
                        ? "A clear picture of who paid, who owes and who is owed."
                        : "Create a group to start sharing trip expenses."}
                    </p>
                  </div>

                  {group ? (
                    <button
                      type="button"
                      className="bp-small-add"
                      onClick={() => setModal("member")}
                    >
                      ＋ Add member
                    </button>
                  ) : null}
                </div>

                {group ? (
                  <>
                    <div className="bp-member-list">
                      {members.map((member) => (
                        <div
                          className="bp-member-row"
                          key={member.memberId}
                        >
                          <div className="bp-member-avatar">
                            {initials(
                              member.memberName ||
                                `T${member.userId}`
                            )}
                          </div>

                          <div className="bp-member-name">
                            <strong>{memberLabel(member)}</strong>
                            <small>
                              {member.role === "OWNER"
                                ? "Trip owner"
                                : `Member · ID ${member.userId}`}
                            </small>
                          </div>

                          <div className="bp-member-numbers">
                            <span>
                              Paid{" "}
                              <b>{money(member.amountPaid)}</b>
                            </span>
                            <span>
                              Share{" "}
                              <b>{money(member.totalShare)}</b>
                            </span>
                          </div>

                          <div
                            className={`bp-member-balance ${
                              Number(member.amountOwed) > 0
                                ? "owes"
                                : Number(
                                    member.amountReceivable
                                  ) > 0
                                ? "gets"
                                : "even"
                            }`}
                          >
                            {Number(member.amountOwed) > 0 ? (
                              <>
                                <small>OWES</small>
                                <b>
                                  {money(member.amountOwed)}
                                </b>
                              </>
                            ) : Number(
                                member.amountReceivable
                              ) > 0 ? (
                              <>
                                <small>TO RECEIVE</small>
                                <b>
                                  {money(
                                    member.amountReceivable
                                  )}
                                </b>
                              </>
                            ) : (
                              <>
                                <small>SETTLED</small>
                                <b>₹0</b>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="bp-group-actions">
                      <button
                        type="button"
                        className="bp-button bp-button-soft"
                        onClick={() => setModal("member")}
                      >
                        ＋ Invite by user ID
                      </button>

                      <button
                        type="button"
                        className="bp-button bp-button-dark"
                        onClick={() => {
                          setSettlementForm({
                            payerMemberId: "",
                            receiverMemberId: "",
                            amount: "",
                          });
                          setModal("settlement");
                        }}
                      >
                        Record settlement ↗
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="bp-inline-empty">
                    <span>♧</span>
                    <strong>No shared wallet yet</strong>
                    <p>
                      Set up a group to split expenses and
                      track balances.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setGroupName(
                          `${selectedTrip?.tripName || "Trip"} Group`
                        );
                        setModal("group");
                      }}
                    >
                      Create group wallet ↗
                    </button>
                  </div>
                )}
              </section>

              <section className="bp-panel bp-settlement-panel">
                <div className="bp-panel-head">
                  <div>
                    <span className="bp-kicker">
                      SQUARE THE TAB
                    </span>
                    <h2>Settlements</h2>
                    <p>
                      Track payments between travel companions.
                    </p>
                  </div>

                  <span className="bp-panel-count">
                    {pendingSettlements.length} PENDING
                  </span>
                </div>

                {group && settlements.length ? (
                  <div className="bp-settlement-list">
                    {settlements.map((item) => {
                      const payer = memberById(
                        item.payerMemberId
                      );

                      const receiver = memberById(
                        item.receiverMemberId
                      );

                      return (
                        <div
                          className="bp-settlement-row"
                          key={item.settlementId}
                        >
                          <div className="bp-settlement-flow">
                            <span>
                              {initials(
                                payer?.memberName ||
                                  `T${payer?.userId || item.payerMemberId}`
                              )}
                            </span>
                            <i>→</i>
                            <span>
                              {initials(
                                receiver?.memberName ||
                                  `T${receiver?.userId || item.receiverMemberId}`
                              )}
                            </span>
                          </div>

                          <div className="bp-settlement-info">
                            <strong>
                              {payer
                                ? memberLabel(payer)
                                : `Member #${item.payerMemberId}`}
                              <small> pays </small>
                              {receiver
                                ? memberLabel(receiver)
                                : `Member #${item.receiverMemberId}`}
                            </strong>

                            <span>
                              {niceDate(item.createdAt)}
                            </span>
                          </div>

                          <div className="bp-settlement-amount">
                            <b>{money(item.amount)}</b>
                            <span
                              className={
                                item.status === "COMPLETED"
                                  ? "complete"
                                  : "pending"
                              }
                            >
                              {item.status}
                            </span>
                          </div>

                          {item.status === "PENDING" ? (
                            <button
                              type="button"
                              className="bp-complete-button"
                              disabled={busy}
                              onClick={() =>
                                handleCompleteSettlement(
                                  item.settlementId
                                )
                              }
                            >
                              Mark paid
                            </button>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bp-inline-empty compact">
                    <span>↔</span>
                    <strong>No settlements yet</strong>
                    <p>
                      When someone pays another member back,
                      record it here.
                    </p>
                  </div>
                )}

                {group ? (
                  <div className="bp-settlement-summary">
                    <div>
                      <span>COMPLETED</span>
                      <strong>{paidSettlements.length}</strong>
                    </div>
                    <div>
                      <span>AWAITING</span>
                      <strong>{pendingSettlements.length}</strong>
                    </div>
                  </div>
                ) : null}
              </section>
            </div>
          ) : null}

          {activeTab === "activity" ? (
            <section className="bp-panel bp-full-panel">
              <div className="bp-panel-head">
                <div>
                  <span className="bp-kicker">
                    A PAPER TRAIL, WITHOUT THE PAPER
                  </span>
                  <h2>Budget activity</h2>
                  <p>
                    Changes made to your trip budget,
                    allocations and expenses.
                  </p>
                </div>

                <span className="bp-panel-count">
                  {history.length} EVENTS
                </span>
              </div>

              {history.length ? (
                <div className="bp-timeline">
                  {history.map((item) => (
                    <div
                      className="bp-timeline-row"
                      key={item.historyId}
                    >
                      <div className="bp-timeline-mark">
                        {item.eventType?.includes("EXPENSE")
                          ? "↗"
                          : item.eventType?.includes("BUDGET")
                          ? "₹"
                          : "◷"}
                      </div>

                      <div>
                        <strong>
                          {String(
                            item.eventType || "ACTIVITY"
                          )
                            .replaceAll("_", " ")
                            .toLowerCase()
                            .replace(/\b\w/g, (letter) =>
                              letter.toUpperCase()
                            )}
                        </strong>

                        <p>{item.description}</p>

                        <small>
                          {item.createdAt
                            ? new Date(
                                item.createdAt
                              ).toLocaleString("en-IN", {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })
                            : ""}
                        </small>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bp-inline-empty">
                  <span>◷</span>
                  <strong>
                    Your activity will appear here
                  </strong>
                  <p>
                    Budget updates and expense changes are
                    recorded automatically.
                  </p>
                </div>
              )}
            </section>
          ) : null}
        </>
      ) : null}

      {/* BUDGET SETTINGS MODAL */}

      {modal === "budget" ? (
        <Modal
          error={error}
          title="Tune your trip fund"
          subtitle="Adjust the total amount and choose when you want a heads-up."
          onClose={() => setModal("")}
        >
          <form
            className="bp-form"
            onSubmit={handleUpdateBudget}
          >
            <label>
              Total budget (₹)
              <input
                type="number"
                min="1"
                step="0.01"
                value={budgetForm.totalBudget}
                onChange={(event) =>
                  setBudgetForm((current) => ({
                    ...current,
                    totalBudget: event.target.value,
                  }))
                }
                required
              />
            </label>

            <label>
              Alert threshold (%)
              <input
                type="number"
                min="1"
                max="100"
                step="1"
                value={budgetForm.warningThreshold}
                onChange={(event) =>
                  setBudgetForm((current) => ({
                    ...current,
                    warningThreshold: event.target.value,
                  }))
                }
                required
              />
            </label>

            <div className="bp-form-actions">
              <button
                type="button"
                className="bp-button bp-button-soft"
                onClick={() => setModal("")}
              >
                Cancel
              </button>

              <button
                className="bp-button bp-button-dark"
                disabled={busy}
              >
                {busy ? "Saving…" : "Save budget"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {/* EXPENSE MODAL */}

      {modal === "expense" ? (
        <Modal
          error={error}
          title={
            editingExpense ? "Edit expense" : "Add an expense"
          }
          subtitle={
            group
              ? "This expense will be included in the shared group balance."
              : "Capture the cost now. You can always review it later."
          }
          onClose={() => setModal("")}
          wide
        >
          <form
            className="bp-form"
            onSubmit={handleSaveExpense}
          >
            <div className="bp-form-grid">
              <label>
                What was it for?
                <input
                  value={expenseForm.description}
                  onChange={(event) =>
                    setExpenseForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder="e.g. Dinner by the beach"
                  maxLength="180"
                  required
                />
              </label>

              <label>
                Amount (₹)
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={expenseForm.amount}
                  onChange={(event) =>
                    setExpenseForm((current) => ({
                      ...current,
                      amount: event.target.value,
                    }))
                  }
                  placeholder="1200"
                  required
                />
              </label>

              <label>
                Category
                <select
                  value={expenseForm.category}
                  onChange={(event) =>
                    setExpenseForm((current) => ({
                      ...current,
                      category: event.target.value,
                    }))
                  }
                >
                  {CATEGORIES.map((category) => (
                    <option
                      key={category.value}
                      value={category.value}
                    >
                      {category.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Date
                <input
                  type="date"
                  value={expenseForm.expenseDate}
                  onChange={(event) =>
                    setExpenseForm((current) => ({
                      ...current,
                      expenseDate: event.target.value,
                    }))
                  }
                  required
                />
              </label>

              <label>
                Payment method
                <select
                  value={expenseForm.paymentMethod}
                  onChange={(event) =>
                    setExpenseForm((current) => ({
                      ...current,
                      paymentMethod: event.target.value,
                    }))
                  }
                >
                  {[
                    "UPI",
                    "Gpay",
                    "CASH",
                    "CARD",
                    "BANK_TRANSFER",
                    "OTHER",
                  ].map((method) => (
                    <option key={method} value={method}>
                      {method.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              </label>

              {group ? (
                <label>
                  Split method
                  <select
                    disabled={Boolean(editingExpense)}
                    value={expenseForm.splitType}
                    onChange={(event) =>
                      setExpenseForm((current) => ({
                        ...current,
                        splitType: event.target.value,
                        shares: {},
                      }))
                    }
                  >
                    <option value="EQUAL">Equal split</option>
                    <option value="CUSTOM">Custom amounts</option>
                    <option value="PERCENTAGE">
                      By percentage
                    </option>
                  </select>

                  {editingExpense ? (
                    <small className="bp-field-hint">
                      Split type cannot be changed while
                      editing an existing group expense.
                    </small>
                  ) : null}
                </label>
              ) : null}
            </div>

            {group &&
            !editingExpense &&
            expenseForm.splitType !== "EQUAL" ? (
              <div className="bp-split-editor">
                <div>
                  <strong>
                    {expenseForm.splitType === "CUSTOM"
                      ? "Share per member"
                      : "Percentage per member"}
                  </strong>
                  <small>
                    {expenseForm.splitType === "CUSTOM"
                      ? "Amounts must add up to the expense total."
                      : "Percentages must add up to 100%."}
                  </small>
                </div>

                {members.map((member) => (
                  <label key={member.memberId}>
                    <span>{memberLabel(member)}</span>

                    <div className="bp-split-input">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          expenseForm.shares[member.userId] ||
                          ""
                        }
                        onChange={(event) =>
                          setExpenseForm((current) => ({
                            ...current,
                            shares: {
                              ...current.shares,
                              [member.userId]:
                                event.target.value,
                            },
                          }))
                        }
                        placeholder="0"
                      />

                      <b>
                        {expenseForm.splitType === "CUSTOM"
                          ? "₹"
                          : "%"}
                      </b>
                    </div>
                  </label>
                ))}
              </div>
            ) : null}

            <div className="bp-form-actions">
              <button
                type="button"
                className="bp-button bp-button-soft"
                onClick={() => setModal("")}
              >
                Cancel
              </button>

              <button
                className="bp-button bp-button-dark"
                disabled={busy}
              >
                {busy
                  ? "Saving…"
                  : editingExpense
                  ? "Save changes"
                  : "Add expense"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {/* CATEGORY MODAL */}

      {modal === "category" ? (
        <Modal
          error={error}
          title="Create a category limit"
          subtitle="Give an important part of your trip its own spending boundary."
          onClose={() => setModal("")}
        >
          <form
            className="bp-form"
            onSubmit={handleSaveCategory}
          >
            <label>
              Category
              <select
                value={categoryForm.category}
                onChange={(event) =>
                  setCategoryForm((current) => ({
                    ...current,
                    category: event.target.value,
                  }))
                }
              >
                {CATEGORIES.map((category) => (
                  <option
                    key={category.value}
                    value={category.value}
                  >
                    {category.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Allocated amount (₹)
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={categoryForm.allocatedAmount}
                onChange={(event) =>
                  setCategoryForm((current) => ({
                    ...current,
                    allocatedAmount: event.target.value,
                  }))
                }
                placeholder="8000"
                required
              />
            </label>

            <div className="bp-form-actions">
              <button
                type="button"
                className="bp-button bp-button-soft"
                onClick={() => setModal("")}
              >
                Cancel
              </button>

              <button
                className="bp-button bp-button-dark"
                disabled={busy}
              >
                {busy ? "Saving…" : "Save limit"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {/* DAILY BUDGET MODAL */}

      {modal === "daily" ? (
        <Modal
          error={error}
          title="Set a daily guardrail"
          subtitle="Give one travel day a comfortable spending limit."
          onClose={() => setModal("")}
        >
          <form
            className="bp-form"
            onSubmit={handleSaveDaily}
          >
            <label>
              Travel date
              <input
                type="date"
                value={dailyForm.budgetDate}
                onChange={(event) =>
                  setDailyForm((current) => ({
                    ...current,
                    budgetDate: event.target.value,
                  }))
                }
                required
              />
            </label>

            <label>
              Daily limit (₹)
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={dailyForm.dailyLimit}
                onChange={(event) =>
                  setDailyForm((current) => ({
                    ...current,
                    dailyLimit: event.target.value,
                  }))
                }
                placeholder="5000"
                required
              />
            </label>

            <div className="bp-form-actions">
              <button
                type="button"
                className="bp-button bp-button-soft"
                onClick={() => setModal("")}
              >
                Cancel
              </button>

              <button
                className="bp-button bp-button-dark"
                disabled={busy}
              >
                {busy ? "Saving…" : "Save daily limit"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {/* GROUP MODAL */}

      {modal === "group" ? (
        <Modal
          error={error}
          title="Create your travel circle"
          subtitle="A shared group wallet keeps everyone's trip costs visible and fair."
          onClose={() => setModal("")}
        >
          <form
            className="bp-form"
            onSubmit={handleCreateGroup}
          >
            <label>
              Group name
              <input
                value={groupName}
                onChange={(event) =>
                  setGroupName(event.target.value)
                }
                placeholder="Ooty weekend crew"
                maxLength="100"
                required
              />
            </label>

            <div className="bp-form-note">
              You'll be added as the group owner automatically.
              You can invite other registered users by their
              user ID next.
            </div>

            <div className="bp-form-actions">
              <button
                type="button"
                className="bp-button bp-button-soft"
                onClick={() => setModal("")}
              >
                Cancel
              </button>

              <button
                className="bp-button bp-button-dark"
                disabled={busy}
              >
                {busy ? "Creating…" : "Create group"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {/* ADD MEMBER MODAL */}

      {modal === "member" ? (
        <Modal
          error={error}
          title="Bring someone along"
          subtitle="Add an existing Weather Planner account to this trip group."
          onClose={() => setModal("")}
        >
          <form
            className="bp-form"
            onSubmit={handleAddMember}
          >
            <label>
              Registered user ID
              <input
                type="number"
                min="1"
                step="1"
                value={newMemberId}
                onChange={(event) =>
                  setNewMemberId(event.target.value)
                }
                placeholder="e.g. 52"
                required
              />
            </label>

            <div className="bp-form-note">
              Ask your travel companion for the numeric user
              ID associated with their account.
            </div>

            <div className="bp-form-actions">
              <button
                type="button"
                className="bp-button bp-button-soft"
                onClick={() => setModal("")}
              >
                Cancel
              </button>

              <button
                className="bp-button bp-button-dark"
                disabled={busy}
              >
                {busy ? "Adding…" : "Add member"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {/* SETTLEMENT MODAL */}

      {modal === "settlement" ? (
        <Modal
          error={error}
          title="Record a payback"
          subtitle="Log a payment between two group members. It starts as pending until marked complete."
          onClose={() => setModal("")}
        >
          <form
            className="bp-form"
            onSubmit={handleCreateSettlement}
          >
            <label>
              Who is paying?
              <select
                value={settlementForm.payerMemberId}
                onChange={(event) =>
                  setSettlementForm((current) => ({
                    ...current,
                    payerMemberId: event.target.value,
                  }))
                }
                required
              >
                <option value="">Choose member</option>

                {members.map((member) => (
                  <option
                    key={member.memberId}
                    value={member.memberId}
                  >
                    {memberLabel(member)}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Who receives it?
              <select
                value={settlementForm.receiverMemberId}
                onChange={(event) =>
                  setSettlementForm((current) => ({
                    ...current,
                    receiverMemberId: event.target.value,
                  }))
                }
                required
              >
                <option value="">Choose member</option>

                {members
                  .filter(
                    (member) =>
                      String(member.memberId) !==
                      settlementForm.payerMemberId
                  )
                  .map((member) => (
                    <option
                      key={member.memberId}
                      value={member.memberId}
                    >
                      {memberLabel(member)}
                    </option>
                  ))}
              </select>
            </label>

            <label>
              Amount (₹)
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={settlementForm.amount}
                onChange={(event) =>
                  setSettlementForm((current) => ({
                    ...current,
                    amount: event.target.value,
                  }))
                }
                placeholder="500"
                required
              />
            </label>

            <div className="bp-form-actions">
              <button
                type="button"
                className="bp-button bp-button-soft"
                onClick={() => setModal("")}
              >
                Cancel
              </button>

              <button
                className="bp-button bp-button-dark"
                disabled={busy}
              >
                {busy
                  ? "Recording…"
                  : "Record settlement"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}

// --------------------------------------------------
// EXPENSE ROW
// --------------------------------------------------

function ExpenseRow({
  expense,
  onEdit,
  onDelete,
  compact = false,
}) {
  const category =
    CATEGORIES.find(
      (item) => item.value === expense.category
    ) || CATEGORIES[6];

  return (
    <div
      className={`bp-expense-row ${
        compact ? "compact" : ""
      }`}
    >
      <div className="bp-expense-description">
        <span
          className={`bp-expense-icon ${category.color}`}
        >
          {category.icon}
        </span>

        <div>
          <strong>
            {expense.description ||
              niceCategory(expense.category)}
          </strong>

          <small>
            {expense.paymentMethod || "Payment"}{" "}
            {expense.groupId
              ? "· Shared"
              : "· Personal"}
          </small>
        </div>
      </div>

      {!compact ? (
        <>
          <span className="bp-expense-category">
            {niceCategory(expense.category)}
          </span>

          <span className="bp-expense-date">
            {niceDate(expense.expenseDate)}
          </span>

          <span className="bp-expense-payer">
            You · #{expense.paidByUserId}
          </span>
        </>
      ) : (
        <span className="bp-expense-date">
          {niceDate(expense.expenseDate)}
        </span>
      )}

      <strong className="bp-expense-amount">
        {money(expense.amount)}
      </strong>

      <div className="bp-expense-actions">
        <button
          type="button"
          onClick={() => onEdit(expense)}
          aria-label={`Edit ${expense.description}`}
        >
          ✎
        </button>

        <button
          type="button"
          onClick={() => onDelete(expense)}
          aria-label={`Delete ${expense.description}`}
        >
          ×
        </button>
      </div>
    </div>
  );
}

export default BudgetPanel;
