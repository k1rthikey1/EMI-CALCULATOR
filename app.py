# app.py
from flask import Flask, render_template, request, jsonify
import socket

app = Flask(__name__)

def calculate_emi(principal: float, annual_interest_rate: float, tenure_months: int):
    p = float(principal)
    """
    Calculate EMI and totals using an amortization schedule with monthly rounding.
    This makes total interest accurate compared to emi*N - P with floating errors.
    """
    from decimal import Decimal, getcontext, ROUND_HALF_UP

    # High precision to avoid compounding float errors
    getcontext().prec = 28

    P = Decimal(str(principal))
    N = int(tenure_months)
    annual = Decimal(str(annual_interest_rate))

    if N <= 0 or P <= 0:
        return 0.0, 0.0, 0.0

    R = (annual / Decimal('12') / Decimal('100'))

    TWO_PLACES = Decimal('0.01')

    # Compute EMI (rounded to 2 decimals as paid monthly)
    if R == 0:
        emi = (P / Decimal(N)).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)
    else:
        factor = (Decimal('1') + R) ** N
        emi_raw = P * R * factor / (factor - Decimal('1'))
        emi = emi_raw.quantize(TWO_PLACES, rounding=ROUND_HALF_UP)

    # Amortization to get exact total interest with monthly rounding
    balance = P
    total_interest = Decimal('0.00')
    total_paid = Decimal('0.00')

    for i in range(1, N + 1):
        interest_component = (balance * R).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)
        principal_component = (emi - interest_component).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)

        # Adjust the last payment to clear the balance precisely
        if principal_component > balance or i == N:
            principal_component = balance
            emi_payment = (principal_component + interest_component).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)
        else:
            emi_payment = emi

        balance = (balance - principal_component).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)
        total_interest += interest_component
        total_paid += emi_payment

    return float(emi), float(total_paid), float(total_interest)

@app.route("/", methods=["GET"])
def index():
    return render_template("index.html")

@app.route("/calculate", methods=["POST"])
def calculate():
    data = request.get_json(force=True) or {}
    try:
        loan_amount = float(data.get("loan_amount", 0))
        interest_rate = float(data.get("interest_rate", 0))
        loan_tenure = int(data.get("loan_tenure", 0))  # in months
    except (TypeError, ValueError):
        return jsonify({"error": "Invalid input"}), 400

    emi, total, interest = calculate_emi(loan_amount, interest_rate, loan_tenure)

    return jsonify({
        "monthly_emi": round(emi, 2),
        "total_amount_payable": round(total, 2),
        "total_interest": round(interest, 2)
    })


def find_free_port(start=5000, end=5100):
    for port in range(start, end):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            if sock.connect_ex(("127.0.0.1", port)) != 0:
                return port
    raise RuntimeError("No free port found")

if __name__ == "__main__":
    try:
        # Try default port first
        app.run(host="0.0.0.0", port=5000, debug=True)
    except OSError as e:
        if "Address already in use" in str(e):
            # Find a free port and re-run
            free_port = find_free_port()
            print(f"Port 5000 in use. Switching to port {free_port}...")
            app.run(host="0.0.0.0", port=free_port, debug=True)
        else:
            raise e
