+++
title = 'Switching an Easy-Switch Mouse Between Ubuntu and Windows: Fixing Bluetooth Auto-Reconnect Lag'
date = 2026-07-15T20:00:00+09:00
draft = false
description = 'How to share an Easy-Switch Logitech mouse (such as the MX ERGO S) between Windows over Logi Bolt and Ubuntu over Bluetooth, and get an instant reconnect when you press the switch button. Covers why BlueZ auto-reconnect is unreliable and how to work around it with a systemd user service.'
tags = ['Ubuntu', 'Bluetooth', 'Easy-Switch', 'BlueZ', 'Logitech']
categories = ['Projects']
+++

## What This Post Covers

I share an Easy-Switch Logitech mouse (an `MX ERGO S`, in my case) between a Windows machine and an Ubuntu machine, moving between them with the button on the underside of the mouse.
Windows connects through a Logi Bolt receiver; Ubuntu connects over Bluetooth.
The goal was simple: **press the button, and the mouse just works, with no lag.**
Ubuntu was the problem. After switching, it would take around five seconds to reconnect — or it would never reconnect at all. This post covers what caused that and how I worked around it.

None of this is specific to the MX ERGO S. If you use Easy-Switch to move a mouse or keyboard between multiple PCs, the symptoms may look familiar.

I've kept the dead ends in as well, partly as notes to my future self.

## Just Want the Fix?

Jump to "[The Fix](#the-fix)".

## Contents

- [What I Wanted](#what-i-wanted)
- [Environment](#environment)
- [Why Bluetooth on Ubuntu?](#why-bluetooth-on-ubuntu)
- [The Symptoms](#the-symptoms)
- [Narrowing Down the Cause](#narrowing-down-the-cause)
- [What Didn't Work](#what-didnt-work)
- [The Fix](#the-fix)
- [Closing Thoughts](#closing-thoughts)

## What I Wanted

Here's what I was aiming for:

- Windows connects over a Logi Bolt receiver
- Ubuntu connects over Bluetooth
- The Easy-Switch button moves the mouse between the two machines
- **Ubuntu reconnects instantly, with no perceptible lag**
- No buying a second Logi Bolt receiver — make it work with what I already have

## Environment

| Item | Details |
| --- | --- |
| OS | Ubuntu 24.04, Windows 11 Pro |
| Bluetooth stack | BlueZ |
| Mouse | Logitech MX ERGO S |
| Ubuntu connection | Bluetooth |
| Windows connection | Logi Bolt |

Pairing itself completed without any trouble.

## Why Bluetooth on Ubuntu?

Windows uses a Logi Bolt receiver. If I simply plugged a second Logi Bolt receiver into the Ubuntu box, none of what follows would be necessary.

The problem is that I only own one of them.

Logitech has two generations of wireless receiver: `Unifying`, the older standard, and `Logi Bolt`, its successor. The two are not compatible. A Unifying device won't pair with a Logi Bolt receiver, and vice versa. Logitech's newer mice and keyboards have been moving to Logi Bolt.
So while I have Unifying receivers coming out of my ears, not one of them is any use here.
That leaves Bluetooth as the option on the Ubuntu side.

For reference, Logi Bolt receivers are sold separately for around 1,200 yen (checked June 2026). Prices move, so check the listing for the current figure.

- Model numbers: `LBUSB1` (USB-A) / `LBUSBC` (USB-C)
- Amazon.co.jp product page: https://www.amazon.co.jp/dp/B09HSZKXNY

If 1,200 yen doesn't sound like real money to you, I'd genuinely recommend just buying the second receiver and skipping this entire post.

## The Symptoms

Switching from Windows to Ubuntu with Easy-Switch gave inconsistent results:

- Ubuntu often wouldn't pick the mouse up at all
- Connecting manually always worked
- Sometimes it reconnected right away
- Running `bluetoothctl scan on` would sometimes make it connect

Running `bluetoothctl connect` repeatedly also produced this:

```text
Failed to connect: org.bluez.Error.Failed
Operation already in progress
```

## Narrowing Down the Cause

To work out whether the hardware was at fault or Ubuntu was, I went through the obvious checks in order.

### BlueZ Was Already Up to Date

My first guess was a stale package.

```bash
apt policy bluez
```

```text
Installed: 5.72-0ubuntu5.5
Candidate: 5.72-0ubuntu5.5
```

That's the current version on Ubuntu 24.04, so this wasn't a missing update.

### The Pairing Was Fine

Next, the device info.

```bash
bluetoothctl info XX:XX:XX:XX:XX:3A
```

```text
Paired: yes
Bonded: yes
Trusted: yes
Connected: no
```

Nothing wrong with the pairing or the trust flag. The device is simply sitting there at `Connected: no`.

### Manual Connection Always Worked

```bash
bluetoothctl connect XX:XX:XX:XX:XX:3A
```

This never failed. So the mouse isn't broken and the pairing isn't corrupt — the problem is in **Ubuntu's automatic reconnect path**.

### Scanning Makes It Connect

Starting a scan from inside `bluetoothctl` caused an immediate connection.

```text
power on
scan on
```

```text
Connected: yes
ServicesResolved: yes
```

So when Ubuntu **does** see the MX ERGO S, it connects to it correctly. Which suggested a hypothesis: without something to trigger discovery, the mouse just sits there unconnected.

One note — you may see this during scanning, but it only means a scan is already running. It isn't an error worth chasing.

```text
Failed to start discovery: org.bluez.Error.InProgress
```

### Scanning Continuously Still Wasn't Enough

If the hypothesis held, keeping a scan running permanently should remove the problem entirely: discovery never stops, so the mouse never gets stranded. So I left a scan running.

```bash
exec bluetoothctl --timeout 0 scan on
```

It didn't work out that way. **The mouse was being detected and still wasn't being connected**, more often than not. Tuning the scan interval didn't help either.

So "nothing triggers discovery" isn't the whole story. Something in the path between *detecting* the device and *connecting* to it is also failing. Scanning alone doesn't fix this.

## What Didn't Work

For the record, here's everything that fell short on its own.

| Attempt | Result |
| --- | --- |
| Updating BlueZ | Already current; no change |
| Shortening `ScanIntervalAutoConnect` | Somewhat better, but reconnects stayed inconsistent and sometimes never happened |
| Continuous `scan on` alone | Device detected, frequently still not connected |
| Repeated `connect` calls | `Operation already in progress` |

## The Fix

The approach: keep a scan running so discovery has a trigger, and — separately — explicitly call `connect` whenever the mouse isn't connected. Then run that as a systemd user service so it stays alive for the whole login session.

### 1. Write the Connect Script

Save the following as `~/.local/bin/mx-ergo-connect.sh`. The same idea works for any other mouse; just swap the address.

```bash
#!/bin/bash

DEVICE="XX:XX:XX:XX:XX:3A"  # replace with your device's Bluetooth address

bluetoothctl power on >/dev/null 2>&1
bluetoothctl scan on >/dev/null 2>&1

while true; do
    if ! bluetoothctl info "$DEVICE" 2>/dev/null | grep -q "Connected: yes"; then
        timeout 5 bluetoothctl connect "$DEVICE" >/dev/null 2>&1 || true
    fi

    sleep 1
done
```

Make it executable.

```bash
chmod +x ~/.local/bin/mx-ergo-connect.sh
```

What the script does, in five steps:

1. Turns Bluetooth on and starts scanning
2. Checks the connection state of the MX ERGO S once per second
3. Explicitly calls `bluetoothctl connect` if it isn't connected
4. Gives up after five seconds if the connect attempt hangs
5. Tries again

### 2. Register It as a User Service

Create `~/.config/systemd/user/mx-ergo-scan.service`.

```ini
[Unit]
Description=MX ERGO S auto-connect
After=bluetooth.target

[Service]
ExecStart=%h/.local/bin/mx-ergo-connect.sh
Restart=always

[Install]
WantedBy=default.target
```

Then enable it.

```bash
systemctl --user daemon-reload
systemctl --user enable --now mx-ergo-scan.service
```

Check that it came up.

```bash
systemctl --user status mx-ergo-scan.service
```

```text
Active: active (running)
```

### How It Behaves

The loop running on the Ubuntu side looks like this:

```text
Keep scanning
        ↓
Check connection state every second
        ↓
Call bluetoothctl connect if disconnected
        ↓
Abort after 5 seconds if it hangs
        ↓
Retry
```

Instead of waiting on BlueZ's unreliable auto-reconnect, this keeps pushing explicit connection requests at the mouse.
Since setting this up, switching from Windows back to Ubuntu reconnects near-instantly — close enough to "it connects the moment I press the button."

To be precise, this is a one-second polling loop, so the lag isn't literally zero. But it's well below what you'd notice in practice, and a big improvement on "five seconds" or "never." You could shorten the polling interval further, but you'd be trading CPU time for it. One second is a reasonable starting point.

### The Trade-offs

This treats the symptom, not the cause, and it costs you something. Know what you're signing up for.

- **It clutters the airwaves.**
Scanning continuously means broadcasting probes across the 2.4 GHz band without pause.
That interferes with Wi-Fi and with other Bluetooth devices. If you use Bluetooth earbuds or a headset alongside this, expect audio dropouts or added latency to be the first thing you notice.

- **It costs power.**
The Bluetooth adapter never gets to idle, so battery life on a laptop can take a visible hit.
On a desktop it's negligible; on the move, it isn't.

- **It fights with other Bluetooth operations.**
Because it holds discovery open, you'll hit `org.bluez.Error.InProgress` or `Operation already in progress` when pairing a new device or opening the GNOME settings panel.
Stop the service before doing any pairing work.

- **You can't disconnect on purpose.**
The loop reconnects anything it finds disconnected, so a deliberate disconnect gets undone immediately.
The MX ERGO S can switch to another host, but Ubuntu will keep trying to grab it back the whole time you're using it elsewhere.

Even so, this is what was left after exhausting what BlueZ's own settings could do.
If the trade-offs aren't acceptable, buy the Logi Bolt receiver and connect over USB instead. That's the reliable answer.

## Closing Thoughts

May your QOESL improve.

## Related Posts

- [A Ryzen 5 7600 + RTX 4070 Super Build: A 163,000-Yen Machine for Development and AI Experiments](/blog/dev-pc-build-ryzen7600-rtx4070s/)
