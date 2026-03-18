+++
title = 'How to Set Up Cloudflare Email Routing for a Custom Domain'
date = 2026-03-02T12:00:00+09:00
draft = false
description = 'Learn how to receive email on a custom domain for free using Cloudflare Email Routing and Gmail. No mail server setup required, and the process is almost entirely no-code.'
tags = ['cloudflare', 'email']
categories = ['project']
+++

## What This Article Covers

I created a mail address on my custom domain `mitz17.com`, then used Cloudflare Email Routing to forward incoming messages to Gmail for free.
No server setup, and almost entirely no-code.

## Reference

- [How to receive email sent to a custom domain with Cloudflare Email Routing](https://note.com/yetanother_yk/n/ncdbb530e1cc5)

## Step 1: Open the Domain Dashboard in Cloudflare

### Procedure
1. Log in to Cloudflare.
2. Select the target domain (in this case, `mitz17.com`).

![Domain dashboard](domain-dashboard.png "Domain dashboard in Cloudflare")

## Step 2: Click the Start Button

### Procedure
1. Open **Email** -> **Email Routing** from the left menu.
2. Click **Get started**.

![Routing rule settings](email-routing-rule.png)

## Step 3: Configure Addresses

### Procedure
1. Enter your preferred address in **Custom address**  
   (example: `mitz17@mitz17.com`)
2. Enter the Gmail address you want to forward to in **Destination**
3. Click **Create and continue**

Cloudflare sends a verification email to Gmail.

Click **"Verify email address"** in that message to complete verification.

Settings usually apply in a few minutes.

![Email Routing setup wizard](email-routing-setup.png)

## Step 4: Test Incoming Mail

### Procedure
Send a test message from an external address.

If it arrives in Gmail, you're done.

If not, check:

- MX records are correct
- DNS propagation is complete
- Verification has finished

![Final checklist](routing-checklist.png "It worked!")

## Summary

I was able to receive email on my own domain using Cloudflare Email Routing and Gmail.

Receiving mail is easy.

The harder part is sending mail.

Since SendGrid's free plan has ended, I'm currently considering Mailgun or AWS SES.

Next step: build the outbound sending setup.
