+++
title = "How to Export Last Month's SharePoint List Data to Excel with Power Automate"
date = 2026-03-03T18:05:00+09:00
draft = false
description = "Learn how to export last month's SharePoint Online list data to Excel with Power Automate, including common pitfalls around filtering, internal names, and table insertion."
tags = ["power-automate", "sharepoint-online", "excel", "automation", "workflow"]
categories = ["no-code"]
+++

# Power Automate Pitfalls When Sending Previous Month Data from SharePoint to Excel

This note summarizes the points that gave me trouble when trying to build the following flow in Power Automate, with a minimum amount of terminology explanation along the way.

- Run automatically on the first day of every month
- Retrieve **previous-month data** from a SharePoint Online list
- Copy a template Excel file and create a new file
- Add the retrieved records to an Excel table one by one
- Convert the Excel file to PDF

---

## 0. First, the Conclusion: What Was Actually Hard?

I struggled with these three points:

1. You need to check the difference between a column's visible name and the internal name used in the flow
2. When adding rows to Excel, the target must be a proper table, and the required shape is strict
3. The product is simply hard to use sometimes

---

## 1. Key Terms You Need to Know

### Power Automate (Flow)

Microsoft's automation tool.  
You build a flow by connecting a trigger and a series of actions.

The official product description emphasizes low-code automation and AI-assisted process automation. In practice, it becomes most useful when you are required to integrate deeply with Microsoft products.

---

### SharePoint Online List

Think of it as a database that looks a lot like an Excel sheet.

- One row = one item
- Columns = fields such as usage date, department, name, and so on

---

### Filter Query

A filter expression used when retrieving data from SharePoint Online so that you fetch only records matching a condition.

For example: fetch only rows whose usage date is in the previous month.

---

### For each / Apply to each

A loop that processes multiple records one by one.

For example, if SharePoint returns 10 items, then "Add a row into a table" runs 10 times.

---

### Excel Table

When Power Automate adds rows to Excel, it does not target an arbitrary cell range. It targets an actual **table**.

- The kind you create in Excel with `Insert -> Table`
- Without a table, "Add a row into a table" generally does not work

---

### Internal Name

A SharePoint Online column has both a display name and a separate internal name.

This matters especially for Japanese column names, because the internal name can become an encoded string that does not resemble the display label at all.

---

## 2. Pitfall 1: The SharePoint Column Name Was Not Actually "Usage Date"

### What Happened

I could not reference fields like usage date, department, or employee name from the retrieved data.

The flow save failed with an error like this:

```text
The template validation failed: 'The repetition action(s) 'Apply_to_each' referenced by 'inputs' in action '表に行を追加' are not defined in the template.'
```

### Cause

When I checked the raw output from SharePoint, the column names looked like this:

- Display name: `利用日`
- Internal name: `OData__x5229__x7528__x65e5_`

So even if I wrote an expression like `['利用日']`, it did not exist from the flow's perspective and caused an error.

### How to Find the Internal Name

Run a test and inspect the raw output of `Get items`.  
That is where the real key names appear.

---

## 5. Pitfall 4: Excel "Add a Row into a Table" Requires a Whole Row Object

### Initial Error

`A value must be provided for item`

### Cause

The `item` argument for `Add a row into a table` does not accept a single cell value.  
It expects:

- One full row object

### Example of the Required Shape

```json
{
  "利用日": "2026/02/17",
  "所属": "Unagi Shop",
  "氏名": "Fujii"
}
```

---

## 6. Pitfall 5: It Succeeded, but It Looked Empty

### What I Misunderstood

> "It says success, but nothing was written to Excel."

Power Automate showed no error in the cloud flow, but when I opened the Excel sheet it looked like no data had been inserted.

---

### What Was Actually Happening

When I checked the run history response, I could see:

- `statusCode: 200`
- The returned row values such as date, department, and name

So the processing itself had succeeded.

---

### Real Cause

- There was about a 30-second lag before the file save and visible update were reflected

### Fix

- I added a delay of 30 seconds before the next step

---

## 8. Lesson From the "Broken Connection" Error During Production Deployment

### Error

```text
The connection for 'Add a row into a table' is broken.
Please fix the connection.
```

---

### Why It Happened

Power Automate connections, such as SharePoint Online or Excel Online API authentication, are tied to:

- A user account
- An environment (development / production)
- Authentication tokens

That means a connection created in a development environment may not work as-is in production.

The flow itself can be valid while the connection information alone has become unusable.

---

## How to Check Which Connection Is Broken

### Method 1: Check Each Action Directly

1. Open the flow in edit mode
2. Click the action that seems problematic
3. Check the `Connection` section in the right-side panel

If the connection is broken, it will show something like invalid or needs fixing.

### Method 2: Check the Connection List

1. Open the left menu and go to `Data`
2. Open `Connections`
3. Look for any connection whose status is shown as an error

---

## How I Fixed It

- Click `Fix connection`
- Create a new connection
- In my case, re-authenticating with the production account still did not solve it, so I deleted the failed block and recreated the same action from scratch

---
