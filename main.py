import subprocess
import os

# ✅ Update this to your real Illustrator path
ILLUSTRATOR_PATH = r"C:\Program Files\Adobe\Adobe Illustrator 2025\Support Files\Contents\Windows\Illustrator.exe"



# ✅ This is your run.jsx path (same folder as this script)
JSX_PATH = os.path.join(os.getcwd(), "run.jsx")

def run_illustrator_script():
    if not os.path.exists(ILLUSTRATOR_PATH):
        raise FileNotFoundError("❌ Illustrator not found.")

    if not os.path.exists(JSX_PATH):
        raise FileNotFoundError("❌ run.jsx not found.")

    print("▶ Running Illustrator script...")
    subprocess.run([ILLUSTRATOR_PATH, JSX_PATH], check=True)
    print("✅ Done.")

if __name__ == "__main__":
    run_illustrator_script()
