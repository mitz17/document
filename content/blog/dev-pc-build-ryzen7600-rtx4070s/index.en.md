+++
title = "Ryzen 5 7600 and RTX 4070 Super PC Build: A 162,915 Yen Setup for Development and Local AI"
slug = "dev-pc-build-ryzen7600-rtx4070s"
date = 2026-03-05T00:00:00+09:00
draft = false
description = "A custom PC build using Ryzen 5 7600 and RTX 4070 Super, with a full parts list and purchase prices. This practical 162,915 yen setup is aimed at development work, local AI workloads, and light gaming."
image = "購入パーツ一式.jpg"
tags = ["pc-build", "Ryzen 5 7600", "RTX 4070 Super", "Ubuntu", "dev-environment"]
categories = ["dev-environment"]
+++

This is the configuration I bought during the Black Friday sale in November 2024.  
It is no longer the latest build, but I am still very happy with it as a machine that balances software development and local AI work, so I wanted to document it here as a practical example.

## Table of Contents

- [Main Use Cases](#main-use-cases)
- [Why I Replaced My Previous PC](#why-i-replaced-my-previous-pc)
- [Parts List and Purchase Prices](#parts-list-and-purchase-prices)
- [Why I Chose Each Part](#why-i-chose-each-part)
- [Why I Switched to microATX to Save Space](#why-i-switched-to-microatx-to-save-space)
- [Where I Deliberately Cut Costs](#where-i-deliberately-cut-costs)
- [Build-Time Notes](#build-time-notes)
- [Summary](#summary)

---

## Main Use Cases

- Everyday development work such as editors, builds, Docker, and databases
- Local LLM and AI workloads
- Games that are not especially demanding

## Why I Replaced My Previous PC

My previous GPU was a `GTX 760` from the Kepler generation, with CUDA Compute Capability 3.0.  
Recent versions of PyTorch and TensorFlow often require CUDA capability 3.5 or higher, and in many cases 5.0 or higher, which meant I could no longer satisfy library requirements and local AI experimentation had effectively become impractical.

I replaced the whole system so I could realistically run local inference and fine-tuning workloads again.

## Parts List and Purchase Prices

{{< figure src="購入パーツ一式.jpg" alt="Purchased PC parts" >}}

| Part | Model / Spec | Price | Store |
| --- | --- | ---: | --- |
| CPU + motherboard + RAM bundle | Ryzen 5 7600 / B650M Pro RS / DDR5 32GB | ¥49,800 | Sofmap |
| GPU | RTX 4070 Super (12GB VRAM) | ¥93,500 | Dospara |
| SSD | M.2 NVMe 500GB | ¥5,590 | Tsukumo |
| Case | Antec CX200 RGB Elite | ¥6,380 | PC Koubou |
| PSU | 650W 80PLUS Bronze | ¥7,645 | Joshin |

**Total: ¥162,915 (tax included)**

All parts were purchased online. Ubuntu was used as the OS, so there was no OS license cost.  
Existing HDDs and secondary SSDs were reused and are not included in the total above.

## Why I Chose Each Part

### Ryzen 5 7600

It sits in the entry class of the AM5 platform, but single-threaded performance is strong, and I judged it to be more than enough for day-to-day responsiveness during development work such as editor use, builds, and general desktop tasks.  

For workloads where multi-thread performance dominates, such as video encoding or very large compiles, a higher-end CPU could certainly make sense. But for the main purpose of this build, I considered that unnecessary spending and redirected the budget elsewhere.

### RTX 4070 Super (12GB VRAM)

For local AI experiments, VRAM directly determines the size of model you can load realistically.  
If you want to run roughly 7B to 13B class models in float16, something like 14GB to 26GB of VRAM would be ideal in broad terms. But with quantized formats such as GGUF or AWQ, 12GB is still practical for 7B to 13B class experimentation.

Within this budget, maximizing usable VRAM was the main reason I went with this GPU.

### 32GB DDR5 Memory

In a development environment where Docker, an IDE, browsers, and databases are open at the same time, 16GB becomes restrictive fairly quickly depending on the workflow.  
I chose 32GB mainly to secure comfortable practical headroom, and the price at the time also made the choice easier.

That said, required capacity depends heavily on your own workload and Docker image footprint, so this should be treated as a reference point rather than a universal rule.

### Ubuntu

Using Ubuntu reduced OS cost to zero, which let me move more of the budget into the GPU and memory.  
It also fits well with the AI and development tooling ecosystem, so for this machine's intended use I considered it the more rational choice.

## Why I Switched to microATX to Save Space

My previous PC used a full-size ATX tower and took up too much space.  
This time I switched to a microATX build specifically to reduce the footprint.

The case, `Antec CX200 RGB Elite`, matches its review reputation in that it is not the easiest case to build in, and the limited internal space makes cable routing somewhat cramped.  
Still, I like how it looks once everything is assembled, so overall I think it was a good tradeoff.

## Where I Deliberately Cut Costs

**Power supply: chose a non-modular unit**  
A 650W 80PLUS Bronze PSU is sufficient for an RTX 4070 Super (220W TDP) plus Ryzen 5 7600 (65W) configuration.  
Fully modular PSUs do make cable handling easier, but I decided the price difference was better spent on other parts and went with a non-modular model.

**Prioritized price-to-performance over appearance**  
Because the case is white, I originally wanted a white GPU too. But paying tens of thousands of yen extra just for the external color did not make sense, so I dropped that idea.

**Reused existing storage**  
The HDDs and secondary SSDs were carried over from the previous system. The only new storage purchase was the 500GB M.2 NVMe drive for the OS, which helped keep the total cost down.

## Build-Time Notes

### If You Plan to Add an M.2 Wi-Fi Card Later

In this case, if you add an M.2 Wi-Fi adapter later, the antenna cable path from the motherboard to the rear slot area becomes fairly long and tight.  
If you expect to add one later, it is worth checking the antenna routing before the full build is finished.

## Summary

This build followed a simple rule: spend money only where it actually matters.

- **GPU**: prioritized VRAM and put more than half of the total budget there
- **CPU**: kept day-to-day development responsiveness high while controlling cost
- **Memory**: secured 32GB for realistic Docker plus IDE multitasking
- **OS and storage**: saved money through a free OS and reused drives

At a total of 162,915 yen, this turned into a practical machine for both development work and local AI workloads.  
The prices reflect what I paid at the time, so they will differ from current market prices, but I hope the configuration itself is still useful as a reference.

---

## Related Posts

- [Ryzen 5 7600 + RTX 4070 SUPER Gaming Benchmarks | Is It Overkill for 1080p?](/en/blog/pc-benchmark/)
- [Why I Built an Ansys Version Selector Tool | Reducing the Risk of Opening Old Simulation Files in the Wrong Version](/en/blog/ansys-version-selector/)
- [Python MP3 Volume Normalizer with ffmpeg: How It Works and How to Use It](/en/blog/mp3-normalizer-devlog/)
