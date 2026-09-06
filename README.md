# 🚍 BusFix Hyderabad

### Public Transport Information Reliability Platform for Hyderabad

BusFix Hyderabad is a public transport information reliability platform designed to identify and document discrepancies between **scheduled public transport information** and **what passengers actually observe in the real world**.

> **Gamyam tells you where the bus is. BusFix tells you how reliable the information actually is.**

---

## 🎯 Problem

Public transport applications provide useful information such as:

- Bus routes
- Bus stops
- Schedules
- Live bus information
- Tracking information

However, passengers may sometimes encounter situations where the information available to them does not match reality.

For example:

- A bus arrives but live information is unavailable.
- A route is displayed incorrectly.
- Bus tracking information is unavailable.
- Stop information may be incorrect.
- Scheduled information may not reflect what actually happens.

There is currently a gap between **transport information** and **passenger-observed reality**.

BusFix Hyderabad aims to address this gap.

---

## 💡 Our Approach

BusFix separates transport information into two important categories:

### 1. Scheduled Information

Information obtained from official public transport datasets, such as:

- Routes
- Stops
- Scheduled trips
- Scheduled arrival/departure times

### 2. Observed Information

Information reported or observed by passengers, such as:

- Bus arrived but live information was missing
- Incorrect bus information
- Incorrect route information
- Tracking unavailable
- Incorrect stop information

This distinction is important because a scheduled arrival is **not proof that a bus actually arrived**.

---

## 🚀 Current Features

### 🚌 Bus Route Search

Search for Hyderabad bus routes using route numbers.

### 📍 Route Details

View information associated with a selected route, including:

- Route ID
- Trip information
- Direction
- Scheduled stops
- Stop sequence
- Scheduled arrival times
- Stop coordinates

### 🗺️ Interactive Route Map

Routes can be visualized on an interactive map using bus stop coordinates.

The map currently connects the available stop coordinates to visualize the route.

> The displayed line represents the sequence of stops and is not necessarily the actual road path followed by the bus.

### 🚨 Passenger Issue Reporting

Passengers can report discrepancies between transport information and their real-world observations.

Current issue categories include:

- Live data missing
- Wrong bus information
- Wrong route information
- Schedule unavailable
- Tracking unavailable
- Stop information wrong
- Other

### 🔌 FastAPI Backend

The project includes a Python FastAPI backend providing APIs for:

- Route retrieval
- Route search
- Route stops
- Route trips
- Passenger issue reports

### 📊 Information Reliability Architecture

The project is designed to eventually convert passenger observations into an **Information Health / Reliability** measure for routes and stops.

The current reliability values shown in the interface are demo values and are not yet calculated from real-world reports.

---

## 🗂️ Project Structure

```text
busfix-hyderabad/
│
├── backend/
│   ├── gtfs.py
│   └── main.py
│
├── data/
│   ├── agency.txt
│   ├── calendar.txt
│   ├── feed_info.txt
│   ├── routes.txt
│   ├── stops.txt
│   ├── stop_times.txt
│   └── trips.txt
│
├── frontend/
│   ├── app/
│   │   ├── report/
│   │   ├── route/
│   │   ├── Map.tsx
│   │   ├── page.tsx
│   │   └── layout.tsx
│   │
│   ├── package.json
│   └── ...
│
├── .gitignore
└── README.md