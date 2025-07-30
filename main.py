import subprocess
import os

# ✅ Full path to Illustrator executable
ILLUSTRATOR_PATH = r"C:\Program Files\Adobe\Adobe Illustrator 2025\Support Files\Contents\Windows\Illustrator.exe"

# ✅ Full path to run.jsx (same directory as this Python script)
JSX_PATH = os.path.join(os.getcwd(), "run.jsx")

def run_illustrator_script():
    if not os.path.exists(ILLUSTRATOR_PATH):
        raise FileNotFoundError("[ERROR] Illustrator not found at the specified path.")

    if not os.path.exists(JSX_PATH):
        raise FileNotFoundError("[ERROR] run.jsx not found in the current working directory.")

    print(f"[INFO] Illustrator path: {ILLUSTRATOR_PATH}")
    print(f"[INFO] JSX script path: {JSX_PATH}")
    print("[INFO] Launching Illustrator and running the JSX script...")

    try:
        subprocess.run([ILLUSTRATOR_PATH, JSX_PATH], check=True)
        print("[SUCCESS] Illustrator script completed.")
    except subprocess.CalledProcessError as e:
        print(f"[ERROR] Illustrator script failed with error: {e}")
        raise

if __name__ == "__main__":
    run_illustrator_script()
