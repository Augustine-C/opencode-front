"""Create byte-identical plugin source archives for safe publication retries."""
import os
import pathlib
import stat
import subprocess
import zipfile

tag = os.environ["RELEASE_TAG"]
target = pathlib.Path("artifacts") / f"opencode-front-codearts-plugin-{tag}.zip"
with zipfile.ZipFile(target, "w", compression=zipfile.ZIP_DEFLATED) as archive:
    tracked = subprocess.check_output(["git", "ls-files", "-z", "packages/codearts-proxy-extension"])
    for name in sorted(os.fsdecode(tracked).rstrip("\0").split("\0")):
        source = pathlib.Path(name)
        if not source.is_file():
            continue
        info = zipfile.ZipInfo(source.as_posix(), date_time=(1980, 1, 1, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = (stat.S_IFREG | (source.stat().st_mode & 0o777)) << 16
        archive.writestr(info, source.read_bytes())
