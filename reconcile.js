// Payment reconciliation.
//
// Reads payments.jsonl and works out how much money we actually collected.
// Run:  node reconcile.js

const fs = require("fs");

// Amounts may arrive as numbers or as strings with thousands separators ("55,707.77").
function parseAmount(amount) {
  if (typeof amount === "string") return Number(amount.replace(/,/g, ""));
  return Number(amount);
}

// Keep only the latest attempt (by timestamp) for each txn_id.
const latest = new Map();

const lines = fs.readFileSync("payments.jsonl", "utf8").split(/\r?\n/);
for (const line of lines) {
  if (line.trim().length === 0) continue;

  let event;
  try {
    event = JSON.parse(line);
  } catch {
    continue; // unreadable line
  }
  if (!event || typeof event !== "object" || !event.txn_id) continue;

  const ts = Date.parse(event.ts);
  const prev = latest.get(event.txn_id);
  if (!prev || ts > prev.ts) {
    latest.set(event.txn_id, { status: event.status, amount: event.amount, ts });
  }
}

let total = 0;
let count = 0;

for (const event of latest.values()) {
  if (event.status === "success") {
    total += parseAmount(event.amount);
    count += 1;
  }
}

const expected = parseInt(fs.readFileSync("expected.txt", "utf8").trim(), 10);

if (count !== expected) {
  console.log(`Check failed: counted ${count} successful payments, expected ${expected}.`);
  console.log("Something in the data isn't being handled the way the README describes.");
} else {
  console.log(`Check passed: ${count} successful payments.`);
  console.log(`Your code: KOYA-${Math.round(total)}`);
}
