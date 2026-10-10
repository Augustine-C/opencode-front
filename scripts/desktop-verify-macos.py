"""Verify the extracted release archive and smoke launch its Electron renderer."""

import os
import pathlib
import re
import signal
import subprocess
import sys
import tempfile
import time

MACH_O_MAGIC = {
    b"\xfe\xed\xfa\xce", b"\xce\xfa\xed\xfe",
    b"\xfe\xed\xfa\xcf", b"\xcf\xfa\xed\xfe",
    b"\xca\xfe\xba\xbe", b"\xbe\xba\xfe\xca",
    b"\xca\xfe\xba\xbf", b"\xbf\xba\xfe\xca",
}


def verify_signatures(app):
    subprocess.run(["codesign", "--verify", "--deep", "--strict", "--verbose=2", str(app)], check=True)
    executable = app / "Contents/MacOS/OpenCode-Front"
    framework = app / "Contents/Frameworks/Electron Framework.framework/Versions/A/Electron Framework"
    if not executable.is_file() or not framework.is_file():
        raise SystemExit("Archive is missing the app executable or Electron Framework")

    for path in sorted(app.rglob("*")):
        if path.is_symlink() or not path.is_file():
            continue
        with path.open("rb") as binary:
            if binary.read(4) not in MACH_O_MAGIC:
                continue
        result = subprocess.run(
            ["codesign", "--display", "--verbose=4", str(path)],
            capture_output=True, text=True, check=True,
        )
        details = result.stdout + result.stderr
        flags = re.search(r"flags=(0x[0-9a-fA-F]+)", details)
        if "Signature=adhoc" not in details or flags is None:
            raise SystemExit(f"Expected an ad hoc signature on {path}:\n{details}")
        # CS_RUNTIME and CS_REQUIRE_LV would prevent ad hoc code from loading its libraries.
        if int(flags.group(1), 16) & (0x10000 | 0x2000):
            raise SystemExit(f"Library validation is still enabled on {path}:\n{details}")
        subprocess.run(["codesign", "--verify", "--strict", str(path)], check=True)
        print(f"Verified ad hoc signature without library validation: {path.relative_to(app)}", flush=True)


def smoke_launch(app):
    executable = app / "Contents/MacOS/OpenCode-Front"
    with tempfile.TemporaryFile() as output:
        process = subprocess.Popen([str(executable)], stdout=output, stderr=output, start_new_session=True)
        try:
            deadline = time.monotonic() + 15
            while time.monotonic() < deadline:
                if process.poll() is not None:
                    output.seek(0)
                    sys.stderr.write(output.read().decode(errors="replace"))
                    raise SystemExit(f"Electron exited during launch with status {process.returncode}")
                time.sleep(0.5)

            processes = subprocess.run(
                ["ps", "-axo", "pgid=,command="], capture_output=True, text=True, check=True,
            )
            commands = [line.strip().split(maxsplit=1) for line in processes.stdout.splitlines()]
            if not any(
                len(parts) == 2 and parts[0] == str(process.pid)
                and "OpenCode-Front Helper" in parts[1] and "--type=renderer" in parts[1]
                for parts in commands
            ):
                output.seek(0)
                sys.stderr.write(output.read().decode(errors="replace"))
                raise SystemExit("Electron did not start a renderer helper in the app's process group")
            print("Archived app launched successfully with a renderer helper", flush=True)
        finally:
            try:
                os.killpg(process.pid, signal.SIGTERM)
            except ProcessLookupError:
                pass
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                try:
                    os.killpg(process.pid, signal.SIGKILL)
                except ProcessLookupError:
                    pass
                process.wait()


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: desktop-verify-macos.py /path/to/OpenCode-Front.app")
    app = pathlib.Path(sys.argv[1]).resolve()
    verify_signatures(app)
    smoke_launch(app)
