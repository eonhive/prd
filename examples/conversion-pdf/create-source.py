# Company: EonHive Inc. | Title: PDF Conversion Fixture Builder
# Purpose: Create a mixed text/image PDF and encrypted rejection fixtures for local conversion tests.
# Author: Stan Nesi | Created: 2026-10-28 | Updated: 2026-10-28
# Notes: Vibe coded with Codex.
from pathlib import Path
from textwrap import wrap
from io import BytesIO

from PIL import Image, ImageDraw, ImageFont
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib.utils import ImageReader
from pypdf import PdfReader, PdfWriter

root = Path(__file__).resolve().parent
root.mkdir(parents=True, exist_ok=True)
fixtures = root / "fixtures"
fixtures.mkdir(exist_ok=True)
pdf = canvas.Canvas(str(root / "source.pdf"), pagesize=letter, invariant=1)
pdf.setTitle("Portable PDF pages")
pdf.setAuthor("Stan Nesi")
pdf.setFont("Helvetica-Bold", 24)
pdf.drawString(54, 726, "Portable PDF pages")

def paragraph(text, top):
    pdf.setFont("Helvetica", 11)
    for line in wrap(text, width=87):
        pdf.drawString(54, top, line)
        top -= 17
    return top - 18

y = paragraph("This page contains extractable PDF text. PRD Convert groups the extracted lines into responsive paragraph nodes inside a page section.", 682)
pdf.setFont("Helvetica-Bold", 15)
pdf.drawString(54, y, "Reading order needs review")
y = paragraph("PDF drawing order can differ from reading order. The converter reports this limitation rather than guessing headings, table relationships or column flow.", y - 28)
pdf.setFont("Helvetica-Bold", 15)
pdf.drawString(54, y, "The next page contains only pixels")
paragraph("The second page simulates a scan. It has no extractable text and is preserved as a bounded page image without OCR. The original PDF is retained as an attachment by default.", y - 28)
pdf.setFont("Helvetica", 9)
pdf.drawString(54, 44, "PDF conversion fixture - page 1")
pdf.showPage()

scan = Image.new("RGB", (1008, 1368), "white")
draw = ImageDraw.Draw(scan)
title_font = ImageFont.load_default(size=40)
body_font = ImageFont.load_default(size=26)
draw.text((50, 65), "Scanned page example", fill="black", font=title_font)
lines = ["This page contains only pixels.", "The converter preserves a page image.", "No OCR text is generated.", "Inspect the visual content and original source."]
for index, line in enumerate(lines):
    draw.text((50, 165 + index * 50), line, fill="black", font=body_font)
draw.rounded_rectangle((50, 440, 440, 660), radius=16, fill="#F1ECFF", outline="#6634CC", width=3)
draw.rounded_rectangle((560, 440, 950, 660), radius=16, fill="#F1ECFF", outline="#6634CC", width=3)
draw.text((96, 525), "Original pixels", fill="black", font=body_font)
draw.text((630, 525), "Page image", fill="black", font=body_font)
draw.line((455, 550, 540, 550), fill="#6634CC", width=6)
draw.polygon([(540, 550), (519, 536), (519, 564)], fill="#6634CC")
draw.text((50, 1255), "PDF conversion fixture - page 2", fill="black", font=body_font)
image = BytesIO()
scan.save(image, format="PNG")
image.seek(0)
pdf.drawImage(ImageReader(image), 54, 54, width=504, height=684)
pdf.save()

for name, password in [("encrypted.pdf", "fixture-password"), ("encrypted-empty-password.pdf", "")]:
    writer = PdfWriter()
    writer.clone_document_from_reader(PdfReader(root / "source.pdf"))
    # Rebuild identifiers as byte strings before pypdf derives fixture encryption keys.
    writer._ID = None
    writer.generate_file_identifiers()
    writer.encrypt(user_password=password, owner_password="fixture-owner", algorithm="RC4-128")
    with (fixtures / name).open("wb") as target:
        writer.write(target)
