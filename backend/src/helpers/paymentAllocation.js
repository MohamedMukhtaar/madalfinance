/** Derive invoice paid amount and status after applying a payment allocation. */
export const deriveInvoiceStatus = (invoice, paidNow) => {
  const newPaid = Number(invoice.paid_amount) + Number(paidNow);
  const total = Number(invoice.total_amount);
  if (newPaid >= total - 0.001) return { paid: total, status: 'Paid' };
  if (newPaid > 0) return { paid: newPaid, status: 'Partial' };
  return { paid: newPaid, status: invoice.status };
};

export const distributeAllocationAmounts = (allocs, oldTotal, newTotal) => {
  if (allocs.length === 1) return [newTotal];
  const amounts = [];
  let assigned = 0;
  for (let i = 0; i < allocs.length - 1; i++) {
    const share = Math.round((Number(allocs[i].amount_allocated) / oldTotal) * newTotal * 100) / 100;
    amounts.push(share);
    assigned += share;
  }
  amounts.push(Math.round((newTotal - assigned) * 100) / 100);
  return amounts;
};
