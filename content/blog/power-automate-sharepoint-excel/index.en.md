+++
title = "How to Export Last Month's SharePoint List Data to Excel with Power Automate"
date = 2026-03-03T18:05:00+09:00
draft = false
description = "Learn how to export last month's SharePoint Online list data to Excel with Power Automate, including common pitfalls around filtering, internal names, and table insertion."
tags = ["power-automate", "sharepoint-online", "excel", "automation"]
categories = ["automation"]
+++

# How to Export Last Month's SharePoint List Data to Excel with Power Automate

This article summarizes the main points that became tricky when I tried to automate the following workflow with Power Automate.

- Run automatically on the first day of every month
- Retrieve last month's data from a SharePoint Online list
- Copy an Excel template and create a new file
- Add the retrieved records one by one into an Excel table
- Convert the result to PDF if needed

## Conclusion First

When you use Power Automate to export last month's data from SharePoint to Excel, the most common trouble spots are these:

1. SharePoint columns often need to be referenced by internal name rather than display name
2. Last-month filters become unstable unless the date range is defined explicitly
3. Excel must use a proper table, and `Add a row into a table` expects a full row object
4. Even after a successful run, there can be a visible delay before Excel reflects the saved data

If you understand those four points first, the whole flow becomes much easier to build.

## Assumptions

This article assumes the following setup:

- A Power Automate cloud flow
- SharePoint Online list as the source
- Excel Online table as the output target
- A monthly process that exports only the previous month's data

## Overall Flow

The workflow I wanted looked like this:

1. Trigger on a schedule on the first day of each month
2. Retrieve the previous month's data from SharePoint Online
3. Copy an Excel template and create the month's new file
4. Use `Apply to each` to add rows one by one
5. Wait for save propagation before running downstream actions
6. Convert to PDF if required

None of the individual actions are unusual, but the connections between them are where things start to break.

## Minimal Terminology

### Power Automate

Microsoft's automation tool.  
You connect triggers and actions to build cloud-based workflows.

### SharePoint Online List

A list-style data source that works a bit like a table.  
In this case, it stores fields such as usage date, department, and name.

### Filter Query

A query used to narrow down the items retrieved from SharePoint Online.  
This is critical when you want only the previous month's rows.

### Excel Table

Power Automate's `Add a row into a table` action targets an actual Excel table, not just an arbitrary cell range.  
If the sheet is not table-formatted, this action usually will not behave as expected.

### Internal Name

A SharePoint column has both a display name and an internal name.  
For Japanese column names especially, the internal name may look like an encoded string rather than a readable label.

## 1. SharePoint Column Names May Not Match the Display Name

### What Happened

I could not reliably reference fields such as usage date, department, or employee name using the obvious names.

During save, I sometimes hit template validation errors around `Apply_to_each` and `表に行を追加`.

### Why

In SharePoint output, the internal name may differ from the displayed column name.  
For example:

- Display name: `利用日`
- Internal name: `OData__x5229__x7528__x65e5_`

So even if you write an expression like `['利用日']`, the flow may treat it as a missing property.

### Fix

Run a test flow and inspect the output of `Get items`.  
The raw output reveals the actual keys you need to use.

In practice, when working with SharePoint in Power Automate, it is safer to assume that internal names matter.

## 2. Last-Month Filtering Should Be Defined as an Actual Date Range

Since the goal is to export "last month's data," the filter logic should be explicit.

The simplest mental model is:

- greater than or equal to the first day of last month
- less than the first day of this month

If the internal name of the usage date column is `OData__x5229__x7528__x65e5_`, the logic conceptually looks like this:

```text
OData__x5229__x7528__x65e5_ ge first day of last month
and
OData__x5229__x7528__x65e5_ lt first day of this month
```

The exact expression still depends on your environment and date column type, but the key point is to use a proper start/end date range rather than a vague text-based condition.

## 3. `Add a Row into a Table` Requires an Actual Table and a Full Row Object

### The Error

One of the first errors I ran into was this:

```text
A value must be provided for item
```

### Why

The `item` input for `Add a row into a table` does not accept a single cell value.  
It expects one full row object.

Also, the Excel target must already be a table.

So the real requirements are:

- The Excel sheet must be table-formatted
- Each record must be passed as a full row object

### Example Shape

```json
{
  "利用日": "2026/02/17",
  "所属": "Unagi Shop",
  "氏名": "Fujii"
}
```

Passing this kind of object one record at a time through `Apply to each` is much closer to what the action expects.

## 4. The Flow Can Succeed While Excel Still Looks Empty

### What Happened

Power Automate showed the flow as successful, but when I checked the Excel file it looked like nothing had been written.

### What Was Actually Going On

In the run history, I could still see:

- `statusCode: 200`
- the row values that had been added

So the processing itself had succeeded.

### Why

The issue was the delay between successful execution and visible save reflection in Excel.  
In my case, it could take around 30 seconds.

### Fix

I added a `Delay` step before downstream actions.  
If you move on immediately based only on the flow status, Excel can still look empty for a while.

## 5. Connections Can Break During Production Migration

### The Error

```text
The connection for 'Add a row into a table' is broken.
Please fix the connection.
```

### Why

Power Automate connections are tied to things like:

- user account
- environment (development / production)
- authentication tokens

That means a connection created in development may not remain valid in production.

The flow definition itself may still be fine while only the connection information has become invalid.

### How to Check Which Connection Is Broken

#### Method 1: Check the Action Directly

1. Open the flow in edit mode
2. Click the action that seems to be failing
3. Check the connection section in the right-side panel

#### Method 2: Check the Connection List

1. Open `Data`
2. Open `Connections`
3. Find any connection with an error state

### Fix

- Click `Fix connection`
- Create a new connection
- Recreate the affected action if necessary

In my case, re-authentication alone did not always work, and recreating the failed block was sometimes faster.

## Summary

It is absolutely possible to export last month's SharePoint Online data to Excel with Power Automate, but the following points cause trouble often:

- Use SharePoint internal names
- Think of the previous month as a date range
- Make sure Excel uses a table
- Account for save propagation delay
- Suspect broken connections after environment changes

The individual actions may look simple, but the fragile part is how they are connected.  
If you keep those five points in mind early, the flow becomes much easier to build and debug.
