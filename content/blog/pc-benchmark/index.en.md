+++
title = 'Ryzen 5 7600 + RTX 4070 SUPER Gaming Benchmarks | Is It Overkill for 1080p?'
slug = 'pc-benchmark'
date = 2026-07-16T18:00:00+09:00
draft = false
description = 'Hands-on benchmarks of a home-built PC with a Ryzen 5 7600 and GeForce RTX 4070 SUPER, using Cinebench 2026, 3DMark, and Palworld at 1080p. Measured data shows whether the RTX 4070 SUPER is overkill for Full HD gaming.'
image = 'palworld-42fps.jpg'
tags = ['Ryzen 5 7600', 'RTX 4070 SUPER', 'Cinebench', '3DMark', 'Palworld']
categories = ['PC']
+++

> **Note:** Every score, temperature, and FPS figure in this article is a value I actually measured, and the impressions are based on real play sessions.

This article is a follow-up to [my build log for a Ryzen 5 7600 + RTX 4070 SUPER PC for development and local AI experiments](/blog/dev-pc-build-ryzen7600-rtx4070s/). The previous post covered the parts list and purchase prices; in this one, I add Windows 11 Pro to the same machine and measure how well it performs for gaming. In particular, I look at whether the RTX 4070 SUPER is overkill at 1080p, and whether the Ryzen 5 7600 becomes the bottleneck for gaming performance.

## Table of Contents

- [Background and OS Roles](#background-and-os-roles)
- [Key Takeaways](#key-takeaways)
- [Test System](#test-system)
- [Test Methodology](#test-methodology)
- [A Note on Resolution](#a-note-on-resolution)
- [Synthetic Benchmarks](#synthetic-benchmarks)
- [Gaming Performance](#gaming-performance)
- [Is the RTX 4070 SUPER Overkill for 1080p?](#is-the-rtx-4070-super-overkill-for-1080p)
- [Next Upgrade Candidate](#next-upgrade-candidate)
- [Summary](#summary)
- [Related Articles](#related-articles)

## Background and OS Roles

I originally built this PC as an Ubuntu-only machine for development and local AI experiments. But with a GeForce RTX 4070 SUPER sitting in it, I wanted to use it for gaming too, so I added Windows 11 Pro in a dual-boot setup. I went with Pro because being able to act as the host with the built-in Remote Desktop feature is convenient.

| OS | Main use |
|---|---|
| Ubuntu | Development, local AI, CUDA, technical testing |
| Windows 11 Pro | Gaming, Windows-only benchmarks |

Unless otherwise noted, all measurements in this article were taken on Windows 11 Pro.

## Key Takeaways

With the Ryzen 5 7600 and RTX 4070 SUPER combination, Palworld at max settings in 1080p generally ran at around 60 FPS during normal play, dropping to 42 FPS in demanding scenes.

The main findings are:

- Palworld: roughly 60 FPS at max settings during normal play, with dips to 42 FPS (a single informal test run). There is an occasional light stutter, but nothing that gets in the way of normal play
- Is the RTX 4070 SUPER overkill for 1080p?: In the logged Palworld session, GPU core utilization peaked at 68%, while CPU utilization reached 91.3% first. The GPU had headroom to spare, and the CPU appears to have been the first bottleneck

## Test System

| Item | Component |
|---|---|
| CPU | AMD Ryzen 5 7600 |
| GPU | NVIDIA GeForce RTX 4070 SUPER 12GB |
| OS | Ubuntu / Windows 11 Pro dual boot |

For the full parts list and purchase prices, see the previous article, [my Ryzen 5 7600 + RTX 4070 SUPER build log](/blog/dev-pc-build-ryzen7600-rtx4070s/). This article focuses on the performance testing done on Windows 11 Pro.

## Test Methodology

I used [HWiNFO64](https://www.hwinfo.com/download/) to log temperatures and utilization. It is a free download from the official site, available as an installer or a portable ZIP that requires no installation; I used the portable version (`hwi64_850`).

To keep the runs as reproducible as possible, I standardized the following conditions:

- Only the benchmark itself and HWiNFO64 were running; all other applications were closed
- I checked Windows Update beforehand so that no updates would run during testing
- Graphics settings were left fixed and never changed before or after each benchmark or game session
- Each benchmark was run only once
- A 5-minute cooldown was left between heavy tests to let the PC cool off
- Room temperature, CPU temperature, and GPU temperature were recorded
- Palworld FPS was checked with Steam's built-in FPS counter

### Test Environment

| Item | Detail |
|---|---|
| Room temperature | 25°C |
| Monitoring software | [HWiNFO64](https://www.hwinfo.com/download/) (`hwi64_850`) |
| Benchmark install location | C drive (M.2 NVMe SSD) |
| V-Sync | Off |
| FPS cap | None (unlimited) |

## A Note on Resolution

My monitor's native resolution is 1920 × 1080, and its refresh rate is 120Hz. So all of the main game testing in this article is done at Full HD (1080p).

V-Sync is off and there is no FPS cap, so in theory this setup could push frame rates close to the monitor's 120Hz ceiling.

## Synthetic Benchmarks

### Cinebench 2026

Using Cinebench 2026 (version 2026.1.3), I measured the Ryzen 5 7600's single-core and multi-core performance, along with GPU performance.

| Test | Score | Max CPU temp | Max GPU temp |
|---|---:|---:|---:|
| CPU Single Core | 574 pts | - | - |
| CPU Multi Core | 3043 pts | 86.1°C | - |
| GPU | 77647 pts | 83.6°C | 64.6°C |

Cinebench is a synthetic benchmark that measures rendering performance; it is not a direct indicator of gaming performance.

### 3DMark (Time Spy)

3DMark is a staple benchmark widely used in PC reviews and gaming PC comparisons around the world. For this article, I used the free version's standard run, which requires no additional purchase. Custom runs are a paid feature, so no settings were changed and the default-run results are recorded here.

| Item | Result |
|---|---:|
| Overall score | 16554 |
| Graphics Score | 19739 |
| CPU Score | 8648 |
| Max GPU temp | 82.9°C |

## Gaming Performance

### Palworld

Rather than a formal benchmark for comparing systems, I treat Palworld as an informal check of what frame rates to expect during actual play. It was measured only once.

Playing at max settings, I checked the frame rate with Steam's built-in FPS counter during normal play, including field exploration and combat. The counter generally showed around 60 FPS, dropping to 42 FPS in demanding scenes.

| Item | Result |
|---|---:|
| Graphics settings | Max |
| Number of runs | 1 |
| Typical FPS | ~60 FPS |
| Lowest FPS observed | 42 FPS |
| Raids | Not tested |

A screenshot also shows the 42 FPS reading, and I saved the HWiNFO log (`pal.CSV`). That said, this was not measured multiple times along a fixed route under identical conditions, so please treat these as reference values rather than rigorous average-FPS or 1% low comparison figures.

Subjectively, there is an occasional light stutter depending on the scene, but it never undermines how comfortable the game feels — perfectly fine for normal play.

![Palworld running at max settings, with the FPS counter showing 42 FPS](palworld-42fps.jpg)

I have not tried raids yet. Since enemies, effects, and base structures all pile up at once, frame rates in an actual raid could fall below the minimum seen here.

## Is the RTX 4070 SUPER Overkill for 1080p?

### What the measured data shows

Since I have not tested other GPUs or multiple titles for comparison, I cannot make a general claim about whether the card is overkill. However, the HWiNFO log saved during the Palworld session (`pal.CSV`, about 606 seconds at 1-second intervals) also captured GPU and CPU utilization.

| Metric | Average | Max |
|---|---:|---:|
| GPU core utilization | 28.5% | 68.0% |
| Total CPU utilization | 28.7% | 91.3% |

GPU core utilization peaked at just 68%, leaving headroom throughout the session. Total CPU utilization, on the other hand, reached 91.3% at times, meaning the CPU approached its ceiling before the GPU did. The drop to 42 FPS was most likely driven by CPU load rather than by a lack of GPU performance.

In other words, at least when playing Palworld at these settings, the RTX 4070 SUPER was not the bottleneck and had performance to spare. Keep in mind that this is a record of a single play session; other titles, or heavy scenarios like raids, could behave differently.

### General tendencies (not tested here)

Whether the card ends up being overkill also depends on your monitor's refresh rate and the games you play. I have only tested Palworld, but as general tendencies:

More likely to be overkill if:

- Your monitor is 60Hz
- You mostly play lightweight or older games
- You do not use ray tracing
- You use the GPU only for gaming

Still worthwhile at 1080p if:

- You use a 120Hz or 144Hz+ monitor
- You play at max quality or with ray tracing
- You use frame generation to target high refresh rates
- You also use the GPU for CUDA, Blender, or local AI

For what it's worth, my own test setup already meets that "120Hz or better" condition. Even so, Palworld only reached around 60 FPS in normal play (dropping to 42 FPS), well short of the 120Hz the monitor can display. That lines up with the CPU-bound picture above — the GPU and monitor both had more to give than the CPU let them use.

### Verdict for this build

What the measured data shows is that, at least while playing Palworld at max settings, the GPU had headroom and the CPU hit its limit first. My monitor supports 120Hz, but measured FPS topped out at roughly half of that, so in this title at least, both the GPU's and the monitor's capabilities may be going partly unused. The more you also lean on demanding workloads — ray tracing, CUDA, local AI — the easier it becomes to put this card to good use even in a Full HD environment.

## Next Upgrade Candidate

The top candidate I want to consider is a WQHD (2560 × 1440) monitor. The refresh rate is already covered at 120Hz, so the next priority is stepping up resolution from Full HD.

The RTX 4070 SUPER has more performance than a typical 1080p/60Hz monitor can display, so a resolution upgrade is an effective way to put its gaming performance to use.

One caveat: in titles like Palworld where the CPU hits its ceiling first, a higher refresh rate wouldn't have translated into higher frame rates anyway. Moving to WQHD, on the other hand, redirects the GPU's spare capacity toward rendering resolution, which lines up well with what the measured data showed.

## Summary

The key results of this testing:

- Palworld: max settings, roughly 60 FPS in normal play, dips to 42 FPS. Aside from the occasional stutter, it feels smooth
- Cinebench 2026: CPU Multi Core 3043 pts, GPU 77647 pts
- 3DMark Time Spy: overall score 16554

In the Palworld log, GPU core utilization peaked at 68% while total CPU utilization reached 91.3% — at least in this title, the GPU had headroom and the CPU was the first bottleneck. My test monitor runs at 120Hz, but measured FPS stayed around 60, so that refresh rate headroom went unused too. If you mostly play light games on a 60Hz monitor, the card is that much more likely to be overkill. But if you also use ray tracing, local AI, CUDA, or Blender, it is hard to call this build wasteful even in a Full HD environment.

The next upgrade on my list is a WQHD monitor. The refresh rate is already fine at 120Hz, so resolution is the priority.

## Related Articles

- [Ryzen 5 7600 + RTX 4070 SUPER build example | A 163,000-yen PC for development and AI experiments](/blog/dev-pc-build-ryzen7600-rtx4070s/)
