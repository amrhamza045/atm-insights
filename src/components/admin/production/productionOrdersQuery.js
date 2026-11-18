import { parseDateSearchHint, toCaseInsensitiveRegex } from "./fuzzyProductionSearch";

export const PRODUCTION_EVENTS_PAGE_SIZE = 10;
export const PRODUCTION_REGULAR_PAGE_SIZE = 10;

function escapeRegex(s) {
  return String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function isRegularOnlyMode(filters, scopedEventId) {
  if (scopedEventId) return false;
  return filters.quickFilter === "regular_only" || filters.productionType === "regular";
}

export function shouldIncludeUnlinkedRegular(filters, scopedEventId) {
  if (scopedEventId) return false;
  if (filters.productionType === "catering") return false;
  if (filters.eventStatus !== "all") return false;
  if (filters.dateFrom || filters.dateTo) return false;
  return filters.quickFilter === "all" || filters.quickFilter === "regular_only";
}

export function resolveProductionEventsSort(quickFilter, sortBy = "auto") {
  if (sortBy === "name") return "event_name";
  if (sortBy === "date_asc") return "event_date";
  if (sortBy === "date_desc") return "-event_date";
  if (
    quickFilter === "today" ||
    quickFilter === "upcoming_events" ||
    quickFilter === "this_week" ||
    quickFilter === "this_month"
  ) {
    return "event_date";
  }
  return "-event_date";
}

export function resolveRegularOrdersSort(sortBy = "auto") {
  if (sortBy === "name") return "recipe_name";
  if (sortBy === "date_asc") return "created_date";
  return "-created_date";
}

export function buildRegularOrdersServerQuery({ effectiveBranch, filters }) {
  const {
    search = "",
    batchStatus = "all",
    productionType = "all",
    recipeId = "all",
  } = filters;

  const query = {
    catering_event_id: { $in: [null, ""] },
  };

  if (effectiveBranch) {
    query.branch_id = effectiveBranch;
  }
  if (recipeId !== "all") {
    query.recipe_id = recipeId;
  }
  if (batchStatus !== "all") {
    query.status =
      batchStatus === "active" ? { $in: ["pending", "in_progress"] } : batchStatus;
  }
  if (productionType === "sub_recipe") {
    query.production_stage = "sub_recipe";
  }

  const trimmed = search.trim();
  if (trimmed) {
    const isKeywordMatch = ["regular", "non-event", "unlinked", "general"].some((kw) =>
      kw.includes(trimmed.toLowerCase())
    );
    if (!isKeywordMatch) {
      const ci = toCaseInsensitiveRegex(trimmed);
      const dateHint = parseDateSearchHint(trimmed);
      const orClauses = [
        { recipe_name: { $regex: ci } },
        { output_item_name: { $regex: ci } },
        { branch_name: { $regex: ci } },
        { notes: { $regex: ci } },
      ];
      if (dateHint) {
        orClauses.push({ needed_by_date: { $regex: escapeRegex(dateHint) } });
      }
      query.$or = orClauses;
    }
  }

  return query;
}

export function buildEventOrdersServerQuery({
  effectiveBranch,
  scopedEventId,
  filters,
  bounds,
  includeSearch = false,
}) {
  const {
    search = "",
    batchStatus = "all",
    productionType = "all",
    recipeId = "all",
    dateFrom = "",
    dateTo = "",
    quickFilter = "all",
  } = filters;

  const query = {
    catering_event_id: scopedEventId ? scopedEventId : { $nin: [null, ""] },
  };

  if (effectiveBranch) {
    query.branch_id = effectiveBranch;
  }
  if (recipeId !== "all") {
    query.recipe_id = recipeId;
  }
  if (batchStatus !== "all") {
    query.status =
      batchStatus === "active" ? { $in: ["pending", "in_progress"] } : batchStatus;
  }
  if (productionType === "sub_recipe") {
    query.production_stage = "sub_recipe";
  }

  let minDate = dateFrom || "";
  let maxDate = dateTo || "";

  if (quickFilter === "today") {
    if (!minDate || bounds.today > minDate) minDate = bounds.today;
    if (!maxDate || bounds.today < maxDate) maxDate = bounds.today;
  } else if (quickFilter === "this_week") {
    if (!minDate || bounds.weekStart > minDate) minDate = bounds.weekStart;
    if (!maxDate || bounds.weekEnd < maxDate) maxDate = bounds.weekEnd;
  } else if (quickFilter === "this_month") {
    if (!minDate || bounds.monthStart > minDate) minDate = bounds.monthStart;
    if (!maxDate || bounds.monthEnd < maxDate) maxDate = bounds.monthEnd;
  } else if (quickFilter === "upcoming_events") {
    if (!minDate || bounds.today > minDate) minDate = bounds.today;
  }

  if (minDate && maxDate && minDate > maxDate) {
    return null;
  }

  if (minDate || maxDate) {
    const dateCond = {};
    if (minDate) dateCond.$gte = minDate;
    if (maxDate) dateCond.$lte = maxDate;
    query.needed_by_date = dateCond;
  }

  const trimmed = search.trim();
  if (includeSearch && trimmed) {
    const ci = toCaseInsensitiveRegex(trimmed);
    const dateHint = parseDateSearchHint(trimmed);
    const orClauses = [
      { recipe_name: { $regex: ci } },
      { output_item_name: { $regex: ci } },
      { catering_event_name: { $regex: ci } },
      { needed_by_date: { $regex: escapeRegex(trimmed) } },
    ];
    if (dateHint) {
      orClauses.push({ needed_by_date: { $regex: escapeRegex(dateHint) } });
    }
    query.$or = orClauses;
  }

  return query;
}

export function buildProductionEventsServerQuery({
  effectiveBranch,
  scopedEventId,
  filters,
  bounds,
  constrainedEventIds,
}) {
  const {
    search = "",
    quickFilter = "all",
    productionType = "all",
    eventStatus = "all",
    dateFrom = "",
    dateTo = "",
  } = filters;

  if (quickFilter === "regular_only" || productionType === "regular") {
    return null;
  }
  if (Array.isArray(constrainedEventIds) && constrainedEventIds.length === 0) {
    return null;
  }

  const andClauses = [{ production_batch_count: { $gt: 0 } }];

  if (effectiveBranch) {
    andClauses.push({ branch_id: effectiveBranch });
  }

  if (scopedEventId) {
    if (Array.isArray(constrainedEventIds) && !constrainedEventIds.includes(scopedEventId)) {
      return null;
    }
    andClauses.push({ id: scopedEventId });
  } else if (Array.isArray(constrainedEventIds)) {
    andClauses.push({ id: { $in: constrainedEventIds } });
  }

  // Event status filter
  if (eventStatus !== "all") {
    if (eventStatus === "quoted") {
      andClauses.push({
        status: { $in: ["quoted", "enquiry", "deposit_pending", "deposit_pending_verification"] },
      });
    } else {
      andClauses.push({ status: eventStatus });
    }
  }

  // Quick filter semantics
  let minDate = dateFrom || "";
  let maxDate = dateTo || "";

  if (quickFilter === "today") {
    if (!minDate || bounds.today > minDate) minDate = bounds.today;
    if (!maxDate || bounds.today < maxDate) maxDate = bounds.today;
  } else if (quickFilter === "this_week") {
    if (!minDate || bounds.weekStart > minDate) minDate = bounds.weekStart;
    if (!maxDate || bounds.weekEnd < maxDate) maxDate = bounds.weekEnd;
  } else if (quickFilter === "this_month") {
    if (!minDate || bounds.monthStart > minDate) minDate = bounds.monthStart;
    if (!maxDate || bounds.monthEnd < maxDate) maxDate = bounds.monthEnd;
  } else if (quickFilter === "upcoming_events") {
    if (eventStatus === "completed" || eventStatus === "cancelled") {
      return null;
    }
    andClauses.push({ status: { $nin: ["completed", "cancelled"] } });
    if (!minDate || bounds.today > minDate) minDate = bounds.today;
  } else if (quickFilter === "completed_events") {
    if (eventStatus === "cancelled") {
      return null;
    }
    andClauses.push({ status: { $ne: "cancelled" } });
    andClauses.push({
      $or: [{ status: "completed" }, { event_date: { $lt: bounds.today } }],
    });
  }

  if (minDate && maxDate && minDate > maxDate) {
    return null;
  }

  if (minDate || maxDate) {
    const dateCond = {};
    if (minDate) dateCond.$gte = minDate;
    if (maxDate) dateCond.$lte = maxDate;
    andClauses.push({ event_date: dateCond });
  }

  const trimmed = search.trim();
  if (trimmed && !Array.isArray(constrainedEventIds)) {
    const ci = toCaseInsensitiveRegex(trimmed);
    const dateHint = parseDateSearchHint(trimmed);
    const orClauses = [
      { event_name: { $regex: ci } },
      { client_name: { $regex: ci } },
      { event_code: { $regex: ci } },
      { client_phone: { $regex: escapeRegex(trimmed) } },
      { event_date: { $regex: escapeRegex(trimmed) } },
    ];
    if (dateHint) {
      orClauses.push({ event_date: { $regex: escapeRegex(dateHint) } });
    }
    andClauses.push({ $or: orClauses });
  }

  if (andClauses.length === 1) return andClauses[0];
  return { $and: andClauses };
}