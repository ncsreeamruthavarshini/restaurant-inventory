from pathlib import Path
import csv
import random
import kagglehub
import pytesseract
from PIL import Image, ImageOps, ImageEnhance

# Locate the downloaded menu images.
dataset_path = Path(
    kagglehub.dataset_download(
        "ishanmittal1404/indian-restaurant-menu-card-images"
    )
)

images = sorted(
    p for p in dataset_path.rglob("*")
    if p.is_file() and p.suffix.lower() in {".jpg", ".jpeg", ".png"}
)

if not images:
    raise SystemExit("No menu images found.")

# Select a reproducible sample of 10 images.
random.seed(42)
samples = random.sample(images, min(10, len(images)))

output_path = Path("menu_ocr_sample.csv")

with output_path.open("w", newline="", encoding="utf-8") as file:
    writer = csv.DictWriter(
        file,
        fieldnames=["image_filename", "extracted_text"]
    )
    writer.writeheader()

    for index, image_path in enumerate(samples, start=1):
        print(f"Processing {index}/{len(samples)}: {image_path.name}")

        try:
            with Image.open(image_path) as original:
                image = ImageOps.exif_transpose(original).convert("RGB")
                image.thumbnail((2000, 2000))

                # Improve contrast before OCR.
                image = ImageOps.grayscale(image)
                image = ImageEnhance.Contrast(image).enhance(1.5)

                text = pytesseract.image_to_string(
                    image,
                    config="--psm 11"
                )

            writer.writerow({
                "image_filename": image_path.name,
                "extracted_text": text.strip()
            })

            print("  Extracted characters:", len(text.strip()))

        except Exception as error:
            print("  ERROR:", error)
            writer.writerow({
                "image_filename": image_path.name,
                "extracted_text": f"OCR_ERROR: {error}"
            })

print(f"\nFinished. CSV saved to: {output_path.resolve()}")
