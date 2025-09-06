// static/script.js

// Format number as INR with ₹ and thousands separators
function formatINR(value) {
  const num = Number(value || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(num);
}

// Populate tenure dropdown with options every 3 months
function populateTenureOptions(selectEl, maxMonths = 180, step = 1, defaultMonths = 12) {
  selectEl.innerHTML = "";
  for (let m = step; m <= maxMonths; m += step) {
    const years = (m / 12);
    const labelYears = years >= 1 ? ` (${years.toFixed(years % 1 === 0 ? 0 : 1)} year${years > 1 ? "s" : ""})` : "";
    const opt = document.createElement("option");
    opt.value = String(m);
    opt.textContent = `${m} months${labelYears}`;
    if (m === defaultMonths) opt.selected = true;
    selectEl.appendChild(opt);
  }
}
function calculateEMI() 
{
  let principal = document.getElementById("loanAmount").value;
  let tenure = document.getElementById("tenure").value;
  let rate = document.getElementById("rate").value;

  console.log("Principal:", principal); // 🔴 Debugging output
  console.log("Rate:", rate);
  console.log("Tenure:", tenure);
  
  // Or pause execution
  debugger;  // 🔴 JS execution stops here in browser DevTools
}

async function sendCalculation(loanAmount, interestRate, tenureMonths) {
  const resp = await fetch("/calculate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      loan_amount: loanAmount,
      interest_rate: interestRate,
      loan_tenure: tenureMonths
    })
  });
  if (!resp.ok) throw new Error("Backend error");
  return resp.json();
}

function updateOutputs({ emi, total, interest, principal, rate, tenure }) {
  document.getElementById("monthlyEmi").textContent = formatINR(emi);
  document.getElementById("totalAmount").textContent = formatINR(total);
  document.getElementById("totalInterest").textContent = formatINR(interest);

  document.getElementById("principalOut").textContent = formatINR(principal);
  document.getElementById("rateOut").textContent = `${rate}% per annum`;
  document.getElementById("tenureOut").textContent = `${tenure} months`;
}

function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

document.addEventListener("DOMContentLoaded", async () => {
  const amountEl = document.getElementById("loanAmount");
  const tenureEl = document.getElementById("loanTenure");
  const rateEl = document.getElementById("interestRate");
  const rateTextEl = document.getElementById("rateText");

  populateTenureOptions(tenureEl, 360, 3, 12);
  rateTextEl.textContent = rateEl.value;

  async function recalc() {
    const principal = clamp(parseFloat(amountEl.value || "0"), 0,100000000);
    const rate = clamp(parseFloat(rateEl.value || "0"), 1, 30);
    const tenure = parseInt(tenureEl.value || "0", 10);

    try {
      const data = await sendCalculation(principal, rate, tenure);
      updateOutputs({
        emi: data.monthly_emi,
        total: data.total_amount_payable,
        interest: data.total_interest,
        principal,
        rate,
        tenure
      });
    } catch (e) {
      // Fallback UI reset on error
      updateOutputs({ emi: 0, total: 0, interest: 0, principal, rate, tenure });
      console.error(e);
    }
  }

  // Events
  amountEl.addEventListener("input", recalc);
  tenureEl.addEventListener("change", recalc);
  rateEl.addEventListener("input", () => {
    rateTextEl.textContent = rateEl.value;
    recalc();
  });

  // Initial calc
  recalc();
});


