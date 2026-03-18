+++
title = 'Python MP3 Volume Normalizer with ffmpeg: LUFS Auto Normalization Guide'
date = 2026-03-02T00:00:00+09:00
draft = false
description = 'Development notes for mp3-normalizer, a Python and ffmpeg tool for automatic MP3 loudness normalization with LUFS. Built for batch volume fixes without memorizing ffmpeg commands.'
tags = ['python', 'tkinter', 'ffmpeg', 'LUFS', 'mp3', 'audio-processing']
categories = ['project']
slug = 'mp3-normalizer-devlog'
aliases = ['/en/blog/mp3-lufs-normalizer-python/']
+++

GitHub: [mitz17/mp3-normalizer](https://github.com/mitz17/mp3-normalizer)

## Background

I played some MP3 files I made about 10 years ago and thought, "Wait, why is this so quiet?"
At first I suspected bitrate damage from endless copy-and-paste workflows, but audio quality itself was still fine.
The real issue was inconsistent loudness. That experience led me to build this tool.

## Target Audience

- People who still value old MP3 archives and only want to quickly fix volume
- People who don't want to memorize `ffmpeg` commands but want batch normalization

## Prerequisites (Python and MP3)

- A working environment with Python 3.11+ and ffmpeg 6.x. For ffmpeg installation, see [this Qiita article](https://qiita.com/Tadataka_Takahashi/items/9dcb0cf308db6f5dc31b).
- Prepare a folder of `.mp3` files to normalize. Convert WAV and other formats beforehand if needed.

## What is ffmpeg?

ffmpeg is a classic open-source toolkit for audio/video processing.
It handles conversion, trimming, and normalization from the command line.

`mp3-normalizer` calls ffmpeg's `loudnorm` filter to adjust LUFS.
Even when controlled from a GUI, ffmpeg commands run underneath, so you can flexibly change True Peak ceilings and target LUFS values by adjusting parameters.

If you want the ffmpeg side first (`loudnorm` parameters, `1-pass / 2-pass`, True Peak, LRA), see [ffmpeg loudnorm Guide: LUFS Normalization, True Peak, and 2-Pass Settings](/en/blog/ffmpeg-loudnorm-guide/).

## Environment

- OS: verified on Windows 11 (PowerShell)
- Python: 3.11.7 (`python -m venv .venv` recommended)
- ffmpeg: 6.1 series (`ffmpeg -version`)
- GUI: plain Tkinter + ttk

## Goal

- Make the LUFS normalization workflow reproducible across operating systems
- Keep GUI and CLI outputs aligned with clear history/logs
- Make "replace input folder and normalize" practical in daily workflow

## Project Overview

- Lightweight stack: Python 3.11 + ffmpeg 6.x
- Shared engine for GUI/CLI (`processor.py`) and reusable utilities (`utils.py`)
- `processed_history.json` prevents duplicate processing; `mp3_normalizer.log` stores evidence
- Uses `loudnorm` 1-pass with default targets `-14 LUFS` / `-1 dBFS`

## Problems It Solves

- Old files may still sound good, so normalizing volume alone restores usability
- GUI dropdowns let you run normalization without remembering ffmpeg commands
- Logs record when and how files were processed, which reduces rollback anxiety

## Setup Flow

1. Clone source: `git clone https://github.com/mitz17/mp3-normalizer`
2. Create venv: `python -m venv .venv && source .venv/bin/activate` (Windows: `Activate.ps1`)
3. Install deps: `pip install -r requirements.txt`
4. Run GUI: `python main.py`; run batch via CLI: `python main.py --cli ...`
5. Compare output MP3 files and verify values in logs

## Architecture and Implementation Notes

- `gui.py` builds UI with Tkinter `Frame`s and runs ffmpeg in a worker thread to avoid UI freeze
- `processor.py` scans targets via `Path.rglob('*.mp3')`; collision files get suffixes like `_1`, `_2`
- `-map_metadata 0` keeps ID3 tags during re-encoding
- Logs are plain text with LUFS values and full commands

## Quick Code Walkthrough

`AudioProcessor.process_directory` in `processor.py` scans input, builds a plan, checks duplicates, and generates safe output names ([GitHub code](https://github.com/mitz17/mp3-normalizer/blob/main/processor.py#L180-L232)).

```python
for index, entry in enumerate(plan.entries, start=1):
    destination = output_dir / entry.relative
    ensure_directory(destination.parent)
    destination = destination.with_suffix(".mp3")
    destination = generate_unique_output_path(destination)
    ...
    result = self.executor.normalize(
        input_file=entry.source,
        destination=destination,
        target_lufs=target_lufs,
        true_peak=true_peak,
    )
    results.append(result)
    if result.success:
        self.history_service.mark_processed(entry.relative, entry.size, entry.mtime)

self.history_service.save()
```

`generate_unique_output_path` avoids overwrite by adding `_1`, `_2`, ...
`HistoryService` stores size/mtime in `processed_history.json` and skips already-processed files.

Actual ffmpeg execution happens in `FfmpegExecutor.normalize` ([code](https://github.com/mitz17/mp3-normalizer/blob/main/processor.py#L63-L111)):

```python
command = [
    self.ffmpeg_cmd, "-hide_banner", "-y",
    "-i", str(input_file),
    "-af", f"loudnorm=I={target_lufs}:TP={true_peak}:LRA=11",
    "-c:a", "libmp3lame", "-q:a", "2",
    "-map_metadata", "0",
    str(destination),
]
command_str = format_command(command)
self.logger.info("ffmpeg command: %s", command_str)
completed = subprocess.run(command, check=False, capture_output=True, text=True)
```

The process checks return codes for success/failure, and the same command string appears in GUI logs for transparency.

## GUI Experience

1. Set input/output directories; target MP3 list appears immediately.
2. Enter LUFS and True Peak (defaults `-14 / -1` are fine to start).
3. Tune behavior via recursive and force-reencode toggles.
4. Click run, watch progress logs, and inspect results in one screen.

<p><img src="/images/mp3-normalizer-gui.png" alt="mp3-normalizer GUI mockup" loading="lazy" style="border-radius:16px; box-shadow:0 8px 24px rgba(15,23,42,0.18);"></p>

> A rough GUI mock showing inputs/outputs, target LUFS, target files, and logs on one screen.

## Summary

- Even with a simple Tkinter x ffmpeg stack, the pain of loudness normalization can be reduced a lot.
- If you want to keep using old MP3 files, try cloning and testing `mp3-normalizer`.

## Update: March 4, 2026

- Switched from serial processing to parallel processing for major speed gains.
- In measurement, processing 145 MP3 files improved from 670s to 207.3s (about 3.23x faster, ~69.1% shorter) with 4 workers.
- Worker limit now follows available CPU cores.
- Hardened ffmpeg output encoding handling to reduce Windows mojibake-related failures.

## Update: March 5, 2026

- Issue:
  - In some cases, embedded lyric tags were not preserved during ffmpeg normalization.
- Fix:
  - Added post-process lyric tag copy using `mutagen`.
- Impact:
  - Lyric tags can now be preserved after normalization.

## Update: March 8, 2026

- Addressed the issue where quiet intros could become too loud.
- If input bitrate is detected, output now tries to keep a comparable bitrate to reduce unintended quality loss.
- Added selectable input extensions, so non-MP3 sources are easier to process in batches.
- Added selectable output formats: `mp3`, `aac`, `flac`, `wav`, `ogg`.
- Removed duplicate `workers` definitions and unified parallelism control across GUI/CLI paths.
- Strengthened artwork retention using both ffmpeg mapping adjustments and post-tag migration.

- For ffmpeg command-level details and 2-pass `loudnorm` parameter design, see [ffmpeg loudnorm Guide: LUFS Normalization, True Peak, and 2-Pass Settings](/en/blog/ffmpeg-loudnorm-guide/).
