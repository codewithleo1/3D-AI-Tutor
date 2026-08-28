import os
import hmac
import hashlib
import razorpay
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from db.neon import get_connection

router = APIRouter()

razorpay_client = razorpay.Client(
    auth=(os.getenv("RAZORPAY_KEY_ID"), os.getenv("RAZORPAY_KEY_SECRET"))
)

PROMO_CODES = {
    "MISSNOVA100": 100,
    "MISSNOVA50": 50,
    "LEARNFREE": 100,
}

COURSE_PRICE_PAISE = 100  # Rs.1 = 100 paise


class ValidatePromoRequest(BaseModel):
    code: str


class CreateOrderRequest(BaseModel):
    user_id: str
    user_email: str
    promo_code: str = ""


class VerifyPaymentRequest(BaseModel):
    user_id: str
    user_email: str
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    amount_paid: int
    promo_code: str = ""


@router.post("/payments/validate-promo")
def validate_promo(request: ValidatePromoRequest):
    code = request.code.strip().upper()
    if code in PROMO_CODES:
        discount = PROMO_CODES[code]
        return {
            "success": True,
            "valid": True,
            "discount_percent": discount,
            "message": f"{discount}% off applied!"
        }
    return {"success": True, "valid": False, "message": "Invalid promo code"}


@router.post("/payments/create-order")
def create_order(request: CreateOrderRequest):
    try:
        promo = request.promo_code.strip().upper()
        discount = PROMO_CODES.get(promo, 0)
        final_amount = int(COURSE_PRICE_PAISE * (1 - discount / 100))

        if final_amount == 0:
            _save_payment(
                user_id=request.user_id,
                user_email=request.user_email,
                amount=0,
                promo_code=promo,
                status="free",
                razorpay_order_id="PROMO_FREE",
                razorpay_payment_id="PROMO_FREE",
            )
            return {
                "success": True,
                "free": True,
                "message": "Course unlocked with promo code!"
            }

        order = razorpay_client.order.create({
            "amount": final_amount,
            "currency": "INR",
            "payment_capture": 1,
        })
        return {
            "success": True,
            "free": False,
            "order_id": order["id"],
            "amount": final_amount,
            "currency": "INR",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/payments/verify")
def verify_payment(request: VerifyPaymentRequest):
    try:
        body = f"{request.razorpay_order_id}|{request.razorpay_payment_id}"
        expected = hmac.new(
            os.getenv("RAZORPAY_KEY_SECRET").encode(),
            body.encode(),
            hashlib.sha256
        ).hexdigest()

        if expected != request.razorpay_signature:
            raise HTTPException(status_code=400, detail="Invalid payment signature")

        _save_payment(
            user_id=request.user_id,
            user_email=request.user_email,
            amount=request.amount_paid,
            promo_code=request.promo_code,
            status="paid",
            razorpay_order_id=request.razorpay_order_id,
            razorpay_payment_id=request.razorpay_payment_id,
        )
        return {"success": True, "message": "Payment verified, course unlocked!"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _save_payment(user_id, user_email, amount, promo_code,
                  status, razorpay_order_id, razorpay_payment_id):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO payments
            (user_id, user_email, amount_paise, promo_code,
             status, razorpay_order_id, razorpay_payment_id)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (user_id) DO UPDATE SET
            status = EXCLUDED.status,
            razorpay_payment_id = EXCLUDED.razorpay_payment_id,
            paid_at = NOW()
    """, (user_id, user_email, amount, promo_code,
          status, razorpay_order_id, razorpay_payment_id))
    conn.commit()
    cur.close()
    conn.close()


@router.get("/payments/status")
def check_payment_status(user_id: str):
    """Check if a user has already paid. Called on login to restore courseUnlocked."""
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT id FROM payments WHERE user_id = %s LIMIT 1",
            (user_id,)
        )
        row = cur.fetchone()
        cur.close()
        return {"has_paid": row is not None}
    except Exception:
        return {"has_paid": False}
    finally:
        conn.close()