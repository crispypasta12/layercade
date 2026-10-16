// Who owes whom across expenses, splits and settlements. Shared by the
// Expenses page and the Dashboard's "your desk" card.

// Positive balance: the member is owed money. Negative: they owe.
export function calculateBalances(members, expenses, splits, settlements) {
  const bal = {};
  members.forEach((m) => { bal[m.id] = 0; });

  expenses.forEach((exp) => {
    const expSplits = splits.filter((s) => s.expense_id === exp.id);
    expSplits.forEach((s) => { bal[s.member_id] = (bal[s.member_id] ?? 0) - Number(s.amount); });
    if (exp.paid_by) bal[exp.paid_by] = (bal[exp.paid_by] ?? 0) + Number(exp.amount);
  });

  settlements.forEach((s) => {
    if (s.from_member) bal[s.from_member] = (bal[s.from_member] ?? 0) + Number(s.amount);
    if (s.to_member)   bal[s.to_member]   = (bal[s.to_member]   ?? 0) - Number(s.amount);
  });

  return bal;
}

// Fewest payments that settle every balance: [{ from, to, amount }].
export function simplifyDebts(balances) {
  const cred = [], debt = [];
  Object.entries(balances).forEach(([id, amt]) => {
    const a = Math.round(amt * 100) / 100;
    if (a > 0.01)  cred.push({ id, a });
    if (a < -0.01) debt.push({ id, a: -a });
  });

  const txns = [];
  let ci = 0, di = 0;
  while (ci < cred.length && di < debt.length) {
    const amt = Math.round(Math.min(cred[ci].a, debt[di].a) * 100) / 100;
    txns.push({ from: debt[di].id, to: cred[ci].id, amount: amt });
    cred[ci].a -= amt;
    debt[di].a -= amt;
    if (cred[ci].a < 0.01) ci++;
    if (debt[di].a < 0.01) di++;
  }
  return txns;
}
