"""Package only tracked application sources and deployment manifests for EC2."""

from pathlib import Path
import subprocess
import tarfile

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / ".tools" / "ficct-deploy.tar.gz"
tracked = subprocess.check_output(
    ["git", "ls-files", "-z", "backend", "frontend"], cwd=ROOT
).decode().split("\0")
extra = [
    "backend/.dockerignore",
    "frontend/.dockerignore",
    "frontend/Dockerfile",
    "deploy/cloudflared-web.yml",
    "deploy/compose.yaml",
    "deploy/init-secrets.sh",
]
paths = sorted(set(filter(None, tracked)) | set(extra))
OUTPUT.parent.mkdir(exist_ok=True)
with tarfile.open(OUTPUT, "w:gz") as archive:
    for relative in paths:
        if relative.endswith("firebase-credentials.b64"):
            continue
        path = ROOT / relative
        if path.is_file():
            archive.add(path, arcname=relative)
print(f"Packaged {len(paths)} paths to {OUTPUT} ({OUTPUT.stat().st_size} bytes)")
