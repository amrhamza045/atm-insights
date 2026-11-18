// What Client Feedback shows on its cards and tables.
export const SOURCE = "Catering › delivered events of the selected branches (status Completed, by event date) and the rating and comment their clients gave at the event wrap-up.";

export const KPIS = ["client_rating", "rated_events", "rating_coverage", "happy_share", "low_ratings"];

export const RATING_CARD = {
  title: "How clients rated their events",
  info: { calculation: "The period's rated events by the 1–5 rating their client gave, with their event revenue.", source: SOURCE },
  tones: { r5: "bg-success-600", r4: "bg-success-400", r3: "bg-warning-400", r2: "bg-danger-400", r1: "bg-danger-600" },
  empty: "No client rated an event in this period.",
};

export const GROUP_TABLE = {
  columns: [["rated_events", "Rated", "number", "none"], ["client_rating", "Average", "rating"], ["happy_share", "Rated 4–5", "percent"], ["low_ratings", "Rated 1–2", "number", "down"]],
  info: { calculation: "Delivered events with a client rating, their average rating, the share rated 4 or 5 and how many were rated 1 or 2. Most rated first.", source: SOURCE },
  empty: "No delivered events.",
};