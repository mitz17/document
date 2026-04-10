+++
title = 'Python MP3 Volume Normalizer with ffmpeg: How It Works and How to Use It'
date = 2026-03-02T00:00:00+09:00
lastmod = 2026-03-18T00:00:00+09:00
draft = false
description = 'Normalize inconsistent MP3 loudness in batches with ffmpeg loudnorm. This article explains setup, usage, and implementation details of the Python GUI/CLI tool mp3-normalizer.'
tags = ['python', 'ffmpeg', 'LUFS', 'MP3', 'audio-processing', 'volume-normalization']
categories = ['project']
slug = 'mp3-normalizer-devlog'
aliases = ['/en/blog/mp3-lufs-normalizer-python/']
+++

GitHub: [mitz17/mp3-normalizer](https://github.com/mitz17/mp3-normalizer)

## Are Your MP3 Files All Different Volumes?

Have you ever played an old MP3 file and thought, "Why is this so quiet?" The file itself is not broken, but each track has a different loudness, so you end up adjusting the volume manually every time. This tool solves that problem with **ffmpeg's `loudnorm` filter** and a **Python tool called `mp3-normalizer`**.

Here is what the tool does:

- Batch-normalizes MP3 files in a folder to **-14 LUFS** as a practical default target
- Uses the same processing engine from both **GUI and CLI**
- Re-encodes while preserving ID3 tags, lyrics, and artwork as much as possible
- Tracks processed history in JSON to **avoid duplicate processing and accidental overwrite**

---

## What Is ffmpeg `loudnorm`?

`loudnorm` is a loudness normalization filter built into ffmpeg. Instead of relying only on waveform peak values, it uses **LUFS (Loudness Units Full Scale)**, which is closer to perceived loudness. That makes it much better for fixing tracks that feel too loud or too quiet compared with each other.

If you want a deeper explanation of the parameters and the difference between 1-pass and 2-pass normalization, see [ffmpeg loudnorm Guide: LUFS Normalization, True Peak, and 2-Pass Settings](/en/blog/ffmpeg-loudnorm-guide/).

---

## Intended Readers and Requirements

- People who want to keep old MP3 archives but only need to **fix loudness quickly**
- People who do not want to memorize `ffmpeg` commands but still want batch processing
- Python users who also want to understand the implementation details

You need **Python 3.11 or later** and **ffmpeg 6.x**. For ffmpeg installation, see [this Qiita article](https://qiita.com/Tadataka_Takahashi/items/9dcb0cf308db6f5dc31b). Put the `.mp3` files you want to normalize into one folder first. If you want to process WAV or other formats, convert them in advance or use the extension/output-format options described later.

---

## Setup

```bash
# 1. Clone the repository
git clone https://github.com/mitz17/mp3-normalizer

# 2. Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\Activate.ps1

# 3. Install dependencies
pip install -r requirements.txt

# 4. Launch
python main.py                   # GUI mode
python main.py --cli ...         # CLI batch mode
```

---

## Usage: GUI

1. Set the **input and output directories**. The target MP3 list appears automatically.
2. Enter the **target LUFS and True Peak**. If you are unsure, the defaults (`-14 LUFS / -1 dBFS`) are a safe starting point.
3. Adjust behavior with toggles such as **recursive scan** and **force re-encode**.
4. Click **Run** and watch the progress log update in real time, then review the results after completion.

<p><img src="/images/mp3-normalizer-gui.png" alt="mp3-normalizer GUI" loading="lazy" style="border-radius:16px; box-shadow:0 8px 24px rgba(15,23,42,0.18);"></p>

> You can see input/output paths, target LUFS, target files, and logs on a single screen.

---

## Usage: CLI

If you want batch processing without the GUI, use the CLI mode. It is easier to combine with scripts or task schedulers.

```bash
# Basic usage
python main.py --cli --input ./music_in --output ./music_out

# Change LUFS and True Peak
python main.py --cli --input ./music_in --output ./music_out --lufs -16 --tp -1.5

# Set worker count (default: CPU core count)
python main.py --cli --input ./music_in --output ./music_out --workers 4

# Change input extension and output format
python main.py --cli --input ./music_in --output ./music_out --ext flac --format aac
```

The processing log is saved to `mp3_normalizer.log`, including the LUFS-related output for each ffmpeg command.

---

## Implementation Highlights

### Architecture Overview

```text
main.py
├── gui.py        ─ Tkinter + ttk. Runs ffmpeg in a worker thread to avoid UI freezes
├── processor.py  ─ Shared engine for GUI / CLI. Handles file scanning, deduplication, and normalization
└── utils.py      ─ General utilities such as path generation and log formatting
```

Processed files are tracked in `processed_history.json` using file size and modification time, and are skipped automatically on later runs. With the default setting (`force=False`), existing output files are not overwritten.

### File Scanning and Duplicate Avoidance

In `AudioProcessor.process_directory` inside `processor.py`, the tool scans the input directory, builds a processing plan, and adds suffixes such as `_1` and `_2` when output names would collide ([GitHub code](https://github.com/mitz17/mp3-normalizer/blob/main/processor.py#L180-L232)).

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

### Building the ffmpeg Command

Actual ffmpeg execution happens in `FfmpegExecutor.normalize` ([code here](https://github.com/mitz17/mp3-normalizer/blob/main/processor.py#L63-L111)). The full command is written to the log so you can always see what the GUI is doing underneath.

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

`-map_metadata 0` preserves ID3 metadata during re-encoding, and additional post-processing with the `mutagen` library is used to copy lyric tags that ffmpeg alone may drop.

---

## Update History

| Date | Details |
|------|------|
| 2026-03-04 | Changed from serial processing to parallel processing. Processing 145 files improved from 670 seconds to 207 seconds, about 3.2x faster. Also hardened text encoding handling on Windows. |
| 2026-03-05 | Added lyric tag copy support using `mutagen`, so lyrics can be preserved after normalization. |
| 2026-03-08 | Reduced excessive loudness boost on quiet intros. Added bitrate detection to keep output at a comparable bitrate. Added selectable input extension and output formats (`mp3`, `aac`, `flac`, `wav`, `ogg`). Strengthened artwork retention with a two-step approach. |
| 2026-03-18 | **Known issue**: about 1 in 100 files may lose only the artist tag. The reproduction pattern is still unclear even within the same album. I plan to open an Issue. [If you want to help investigate, start here](https://github.com/mitz17/mp3-normalizer). |

---

## Summary

- Even with a simple Tkinter plus ffmpeg setup, MP3 loudness normalization can be made very practical
- The tool keeps GUI interaction and CLI batch automation aligned around the same processing quality
- If you still have old MP3 files you want to keep using, `mp3-normalizer` is meant to make that cleanup easier

---

## Related Posts

- [How to Use ffmpeg loudnorm for LUFS Normalization](/en/blog/ffmpeg-loudnorm-guide/)
- [Why I Built an Ansys Version Selector Tool | Reducing the Risk of Opening Old Simulation Files in the Wrong Version](/en/blog/ansys-version-selector/)
