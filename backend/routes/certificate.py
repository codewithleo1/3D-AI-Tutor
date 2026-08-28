import io
import os
import qrcode
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas as pdf_canvas
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from db.neon import get_connection

router = APIRouter()

VERIFY_BASE_URL = os.getenv("VERIFY_BASE_URL", "https://3-d-ai-tutor.vercel.app")


class CertificateRequest(BaseModel):
    user_id: str
    student_name: str
    course_title: str
    estimated_hours: int


def short_id(uuid_str: str, year: int) -> str:
    """Generate display ID like MN-A3F7-2026"""
    prefix = uuid_str.replace("-", "")[:4].upper()
    return f"MN-{prefix}-{year}"


def save_certificate(user_id: str, student_name: str, course_title: str) -> dict:
    """Save certificate to DB and return verify_code + display_id."""
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO certificates (user_id, student_name, course_title)
        VALUES (%s, %s, %s)
        ON CONFLICT (user_id, course_title) DO UPDATE SET
            completed_at = NOW()
        RETURNING verify_code, completed_at
    """, (user_id, student_name, course_title))
    row = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()

    verify_code = str(row["verify_code"])
    completed_at = row["completed_at"]
    year = completed_at.year
    return {
        "verify_code": verify_code,
        "display_id": short_id(verify_code, year),
        "completed_at": completed_at,
    }


def generate_pdf(
    student_name: str,
    course_title: str,
    estimated_hours: int,
    display_id: str,
    verify_code: str,
    completed_at,
) -> bytes:
    """Generate certificate PDF and return as bytes."""
    buffer = io.BytesIO()
    W, H = A4  # 595 x 842 pts

    c = pdf_canvas.Canvas(buffer, pagesize=A4)

    # ── Background ──────────────────────────────────────────────
    c.setFillColor(colors.HexColor("#0F0A1E"))
    c.rect(0, 0, W, H, fill=1, stroke=0)

    # ── Outer decorative border ──────────────────────────────────
    c.setStrokeColor(colors.HexColor("#7C3AED"))
    c.setLineWidth(0.5)
    c.roundRect(12*mm, 12*mm, W-24*mm, H-24*mm, 6*mm, fill=0, stroke=1)

    c.setStrokeColor(colors.HexColor("#A78BFA"))
    c.setLineWidth(0.3)
    c.roundRect(15*mm, 15*mm, W-30*mm, H-30*mm, 4*mm, fill=0, stroke=1)

    # ── Corner dots ──────────────────────────────────────────────
    dot_color = colors.HexColor("#A78BFA")
    c.setFillColor(dot_color)
    for x, y in [(14*mm, 14*mm), (W-14*mm, 14*mm),
                 (14*mm, H-14*mm), (W-14*mm, H-14*mm)]:
        c.circle(x, y, 2*mm, fill=1, stroke=0)

    # ── Top tag ──────────────────────────────────────────────────
    tag_y = H - 38*mm
    c.setStrokeColor(colors.HexColor("#A78BFA"))
    c.setLineWidth(0.3)
    tag_w = 120*mm
    tag_x = (W - tag_w) / 2
    c.roundRect(tag_x, tag_y, tag_w, 7*mm, 3.5*mm, fill=0, stroke=1)
    c.setFillColor(colors.HexColor("#A78BFA"))
    c.setFont("Helvetica", 7)
    c.drawCentredString(W/2, tag_y + 2.2*mm, "MISS NOVA  ·  AI LEARNING PLATFORM")

    # ── Trophy seal ──────────────────────────────────────────────
    seal_y = H - 60*mm
    c.setStrokeColor(colors.HexColor("#D97706"))
    c.setLineWidth(1)
    c.circle(W/2, seal_y, 12*mm, fill=0, stroke=1)
    c.setLineWidth(0.4)
    c.circle(W/2, seal_y, 10*mm, fill=0, stroke=1)
    c.setFillColor(colors.HexColor("#F59E0B"))
    c.setFont("Helvetica-Bold", 18)
    c.drawCentredString(W/2, seal_y - 5, "★")

    # ── "This certifies that" ─────────────────────────────────────
    c.setFillColor(colors.HexColor("#9CA3AF"))
    c.setFont("Helvetica", 9)
    c.drawCentredString(W/2, H - 78*mm, "THIS CERTIFIES THAT")

    # ── Student name ──────────────────────────────────────────────
    c.setFillColor(colors.HexColor("#E9D5FF"))
    c.setFont("Helvetica-Bold", 32)
    c.drawCentredString(W/2, H - 90*mm, student_name)

    # ── Divider ───────────────────────────────────────────────────
    div_y = H - 97*mm
    c.setStrokeColor(colors.HexColor("#7C3AED"))
    c.setLineWidth(0.4)
    c.line(30*mm, div_y, W/2 - 5*mm, div_y)
    c.line(W/2 + 5*mm, div_y, W - 30*mm, div_y)
    c.setFillColor(colors.HexColor("#A78BFA"))
    c.rect(W/2 - 1.5*mm, div_y - 1.5*mm, 3*mm, 3*mm, fill=1, stroke=0)

    # ── "Has successfully completed" ──────────────────────────────
    c.setFillColor(colors.HexColor("#9CA3AF"))
    c.setFont("Helvetica", 9)
    c.drawCentredString(W/2, H - 104*mm, "HAS SUCCESSFULLY COMPLETED")

    # ── Course box ────────────────────────────────────────────────
    box_w = 140*mm
    box_x = (W - box_w) / 2
    box_y = H - 122*mm
    c.setFillColor(colors.HexColor("#1E1040"))
    c.setStrokeColor(colors.HexColor("#7C3AED"))
    c.setLineWidth(0.5)
    c.roundRect(box_x, box_y, box_w, 14*mm, 4*mm, fill=1, stroke=1)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 14)
    c.drawCentredString(W/2, box_y + 4.5*mm, course_title[:50])

    # ── Stats row ─────────────────────────────────────────────────
    stats_y = H - 142*mm
    stats_h = 16*mm
    stats_w = W - 60*mm
    stats_x = 30*mm
    c.setFillColor(colors.HexColor("#160D2E"))
    c.setStrokeColor(colors.HexColor("#4C1D95"))
    c.setLineWidth(0.3)
    c.roundRect(stats_x, stats_y, stats_w, stats_h, 3*mm, fill=1, stroke=1)

    col_w = stats_w / 3
    date_str = completed_at.strftime("%d %b %Y")
    stats = [
        ("ISSUED ON", date_str),
        ("DURATION", f"{estimated_hours} Hours"),
        ("CERTIFICATE ID", display_id),
    ]
    for i, (label, value) in enumerate(stats):
        cx = stats_x + col_w * i + col_w / 2
        if i < 2:
            c.setStrokeColor(colors.HexColor("#4C1D95"))
            c.setLineWidth(0.3)
            c.line(stats_x + col_w * (i+1), stats_y + 2*mm,
                   stats_x + col_w * (i+1), stats_y + stats_h - 2*mm)
        c.setFillColor(colors.HexColor("#6B7280"))
        c.setFont("Helvetica", 7)
        c.drawCentredString(cx, stats_y + stats_h - 5*mm, label)
        c.setFillColor(colors.HexColor("#E9D5FF"))
        c.setFont("Helvetica-Bold", 9)
        c.drawCentredString(cx, stats_y + 4*mm, value)

    # ── QR code ───────────────────────────────────────────────────
    verify_url = f"{VERIFY_BASE_URL}/verify?code={verify_code}"
    qr_img = qrcode.make(verify_url)

    qr_size = 28*mm
    qr_x = W/2 - qr_size/2
    qr_y = H - 182*mm

    c.setFillColor(colors.white)
    c.roundRect(qr_x - 2*mm, qr_y - 2*mm, qr_size + 4*mm, qr_size + 4*mm,
                2*mm, fill=1, stroke=0)
    c.drawInlineImage(qr_img, qr_x, qr_y, qr_size, qr_size)

    c.setFillColor(colors.HexColor("#6B7280"))
    c.setFont("Helvetica", 7)
    c.drawCentredString(W/2, qr_y - 5*mm, "SCAN TO VERIFY CERTIFICATE")

    # ── Signature ─────────────────────────────────────────────────
    sig_y = H - 196*mm
    c.setFillColor(colors.HexColor("#A78BFA"))
    c.setFont("Helvetica-Bold", 16)
    c.drawString(30*mm, sig_y + 6*mm, "Miss Nova")
    c.setStrokeColor(colors.HexColor("#4C1D95"))
    c.setLineWidth(0.4)
    c.line(30*mm, sig_y, 90*mm, sig_y)
    c.setFillColor(colors.HexColor("#6B7280"))
    c.setFont("Helvetica", 7)
    c.drawString(30*mm, sig_y - 4*mm, "AI TUTOR · MISS NOVA PLATFORM")

    # ── Verify URL ────────────────────────────────────────────────
    c.setFillColor(colors.HexColor("#4C1D95"))
    c.setFont("Helvetica", 7)
    c.drawCentredString(W/2, 20*mm, verify_url)

    c.save()
    buffer.seek(0)
    return buffer.read()


@router.post("/certificate/generate")
def generate_certificate(request: CertificateRequest):
    try:
        cert = save_certificate(
            user_id=request.user_id,
            student_name=request.student_name,
            course_title=request.course_title,
        )
        pdf_bytes = generate_pdf(
            student_name=request.student_name,
            course_title=request.course_title,
            estimated_hours=request.estimated_hours,
            display_id=cert["display_id"],
            verify_code=cert["verify_code"],
            completed_at=cert["completed_at"],
        )
        headers = {
            "Content-Disposition": 'attachment; filename="MissNova_Certificate.pdf"',
            "X-Verify-Code": cert["verify_code"],
            "X-Display-Id": cert["display_id"],
            "Access-Control-Expose-Headers": "X-Verify-Code, X-Display-Id",
        }
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers=headers,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/certificate/verify")
def verify_certificate(code: str):
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("""
            SELECT student_name, course_title, completed_at, verify_code
            FROM certificates
            WHERE verify_code = %s
        """, (code,))
        row = cur.fetchone()
        cur.close()
        conn.close()

        if not row:
            return {"valid": False}

        verify_code = str(row["verify_code"])
        year = row["completed_at"].year
        return {
            "valid": True,
            "certificate": {
                "student_name": row["student_name"],
                "course_title": row["course_title"],
                "completed_at": row["completed_at"].isoformat(),
                "verify_code": verify_code,
                "display_id": short_id(verify_code, year),
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))