# 🚌 BusFix Hyderabad

### Public Transport Information Reliability Platform for Hyderabad

BusFix Hyderabad is a data-driven public transport information reliability platform designed to identify and document discrepancies between **scheduled transport information** and **what passengers actually observe in the real world**.

> **Gamyam tells you where the bus is. BusFix tells you how reliable the information actually is.**

BusFix is an independent student project and is **not affiliated with or an official replacement for TGSRTC or Gamyam**.

---

## Problem

Public transport applications provide useful information such as:

- Bus routes
- Bus stops
- Scheduled trips
- Arrival and departure times
- Live bus information
- Tracking information

However, passengers may sometimes encounter situations where the information available to them does not match what actually happens.

For example:

- A bus arrives but live information is missing.
- Incorrect bus information is displayed.
- Route information is incorrect.
- Bus tracking is unavailable.
- Stop information may be incorrect.
- Scheduled information may differ from what passengers observe.

This creates a gap between:

**Transport Information → Passenger Experience**

BusFix Hyderabad aims to make this gap measurable.

---

## Core Idea

BusFix separates transport information into two categories.

### 1. Scheduled Information

Information obtained from the TGSRTC GTFS dataset, including:

- Routes
- Stops
- Trips
- Stop sequences
- Scheduled arrival times
- Scheduled departure times
- Stop coordinates

Scheduled data describes what the transport system is expected to provide.

### 2. Observed Information

Information reported by passengers based on what they actually experienced.

Examples include:

- Bus arrived but live information was missing
- Wrong bus information
- Wrong route information
- Tracking unavailable
- Schedule unavailable
- Incorrect stop information

A scheduled arrival is **not treated as proof that a bus actually arrived**.

Similarly, a single passenger report does not automatically prove that an official service or application is incorrect.

Repeated observations provide stronger evidence.

---

## Current Features

### 🚌 Bus Route Search

Search Hyderabad bus routes using route numbers or route names.

The platform currently works with more than **1,500 routes** from the imported TGSRTC GTFS dataset.

---

### 🗺️ Route Details

View detailed information for a selected route, including:

- Route number
- Route name
- Direction
- Scheduled trip information
- Scheduled stops
- Stop sequence
- Scheduled arrival times
- Stop coordinates

Different route directions are handled as separate scheduled journeys.

---

### 🚍 Journey Planner

Plan a journey between two locations using scheduled public transport information.

The journey planner can:

- Search for direct buses
- Identify upcoming scheduled departures
- Order direct options by departure time
- Handle multiple physical GTFS stops matching a location
- Use GPS-based origin detection
- Find alternative journeys when a direct bus is unavailable

Alternative journeys may include:

**BUS → BUS**

or

**BUS → WALK → BUS**

Walking transfers are calculated using stop coordinates rather than being manually hard-coded for individual routes.

> Journey planning is based on scheduled GTFS information. It does not currently provide live bus arrival predictions.

---

### 🗺️ Interactive Route Map

Routes can be visualized using an interactive map based on:

- OpenStreetMap
- Leaflet
- GTFS stop coordinates

The map displays:

- Scheduled stop locations
- Stop sequence
- Route geometry
- Passenger-observation information health

> The displayed line connects GTFS stop coordinates to visualize the scheduled stop sequence. It is not necessarily the actual road path followed by the bus.

> Stop markers represent transport stops and passenger observations, not live bus positions.

---

## Passenger Reporting

Passengers can submit observations about transport information problems.

Current issue categories include:

- Live Data Missing
- Wrong Bus Information
- Wrong Route Information
- Schedule Unavailable
- Tracking Unavailable
- Stop Information Wrong
- Other

Each report records information such as:

- Route
- Stop
- Issue type
- Passenger observation
- Timestamp

The reporting system is designed around **observations rather than accusations**.

A report records what a passenger observed. Multiple observations are used to identify recurring information problems.

---

## Information Health

One of the main components of BusFix is the **Information Health** system.

Instead of simply counting reports, BusFix evaluates reported information problems using multiple factors.

### Severity

Different issue types have different impact levels.

For example:

- Wrong route information has a higher impact than a generic issue.
- Missing live data affects passengers differently from incorrect stop information.

Each issue type therefore receives a severity weight.

### Recency

Recent observations have greater influence than very old observations.

BusFix applies time-based decay so that historical reports gradually have less influence on the current information-health score.

### Evidence Strength

Repeated observations provide stronger evidence.

Evidence is classified using observations across different dates:

- **Low** — limited observation evidence
- **Medium** — observations across multiple dates
- **High** — repeated observations across several dates

Evidence strength is incorporated into the reliability calculation.

---

## Information Health Score

BusFix converts the weighted observation burden into an Information Health score from:

**0 → 100**

Higher score:

**Better information health**

Lower score:

**More attention required**

Current status categories include:

| Score | Status |
|---|---|
| 80–100 | Good |
| 60–79 | Needs Attention |
| Below 60 | Poor |

The system also reports a confidence level based on the amount of observation evidence available.

The score represents **observed information reliability**, not predicted bus arrival accuracy.

---

## Duplicate Observation Detection

BusFix includes a possible duplicate-detection mechanism for passenger reports.

Reports may be considered potentially similar when they have:

- The same route
- The same stop
- The same issue type
- A close time window
- High description similarity

Potential duplicates are identified as evidence for review rather than automatically rejected.

This is important because repeated reports can represent genuine repeated observations.

---

## Stop-Level Information Health

Information health can also be examined at the individual bus-stop level.

The stop analysis provides:

- Stop search
- Routes serving the stop
- Passenger observation count
- Information Health score
- Confidence
- Current status
- Issue breakdown
- Reported information hotspots

This helps identify locations where transport information may require further investigation.

---

## Reliability Dashboard

The reliability dashboard provides a network-level view of reported information problems.

It includes:

- Overall Information Health
- Number of affected routes
- Passenger observation count
- Routes requiring attention
- Route-level Information Health
- Confidence
- Most reported issues

This transforms individual passenger observations into a higher-level view of transport information quality.

---

## Reports and Evidence

The Reports section provides visibility into the observations contributing to the current information-health picture.

It includes:

- Total passenger observations
- Affected routes
- Most common issue
- Most reported stops
- Reports by route
- Recent passenger observations

This provides transparency into how the Information Health indicators are formed.

---

## Technology Stack

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- React Leaflet
- Leaflet

### Backend

- Python
- FastAPI
- Uvicorn

### Database

- MySQL
- MySQL Connector/Python

### Data

- TGSRTC GTFS
- Routes
- Stops
- Trips
- Stop times
- Service calendars

### Maps

- OpenStreetMap
- Leaflet

---

## Project Structure

```text
busfix-hyderabad/
├── backend/
│   ├── main.py
│   ├── gtfs.py
│   └── database.py
│
├── frontend/
│   ├── app/
│   │   ├── journey/
│   │   ├── report/
│   │   ├── reports/
│   │   ├── reliability/
│   │   ├── route/
│   │   ├── stops/
│   │   ├── Map.tsx
│   │   └── page.tsx
│   └── package.json
│
├── data/
│   ├── routes.txt
│   ├── stops.txt
│   ├── trips.txt
│   └── stop_times.txt
│
├── .gitignore
└── README.md
```

## System Architecture

```text
                 TGSRTC GTFS Dataset
                         │
                         ▼
              ┌─────────────────────┐
              │     FastAPI Backend  │
              └─────────────────────┘
                    │           │
          ┌─────────┘           └─────────┐
          ▼                               ▼
   GTFS Route Data                  MySQL Database
          │                               │
          │                        Passenger Reports
          │                               │
          └──────────────┬────────────────┘
                         ▼
              Information Health Engine
                         │
                         ▼
              ┌─────────────────────┐
              │   Next.js Frontend  │
              └─────────────────────┘
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
      Journey         Reports        Reliability
      Planner          Page           Dashboard
          │
          ▼
   Leaflet + OpenStreetMap
```