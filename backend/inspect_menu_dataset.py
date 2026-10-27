import kagglehub
from pathlib import Path

path = kagglehub.dataset_download(
    "ishanmittal1404/indian-restaurant-menu-card-images"
)

dataset_path = Path(path)

print("\nDataset downloaded to:", dataset_path)
print("\nFiles found:")

for item in sorted(dataset_path.rglob("*")):
    if item.is_file():
        print(f"{item.relative_to(dataset_path)} ({item.stat().st_size:,} bytes)")
