# Emergency Blood Broadcast & Real-Time Auto-Matching Module (`/api/v1/emergency`)

The **Emergency Blood Broadcast** module provides an end-to-end, real-time emergency dispatch and automated donor coordination system for urgent blood shortages. It connects hospitals and patients with eligible donors within minutes using geospatial proximity, biological compatibility mapping, multi-channel alerts, real-time WebSockets, and automated radius escalation.

---

## 1. Architecture & Core Workflow

```
       +---------------------------------------------+
       |   POST /api/v1/emergency (Create Request)   |
       +---------------------------------------------+
                              |
                              v
    +---------------------------------------------------+
    | Biological Compatibility Map (Recipients vs Donors)|
    | Geospatial $near Query (VERIFIED, AVAILABLE, ELIG.)|
    +---------------------------------------------------+
                              |
                              v
         +-----------------------------------------+
         | Multi-Channel Notification Pipeline     |
         | 1. In-App Notification (DB record)      |
         | 2. Email Alert (Nodemailer template)    |
         | 3. Socket.io Event ('emergency:new')    |
         +-----------------------------------------+
                              |
                              +--------------------+
                              |                    |
                              v                    v
              +-----------------------+  +----------------------+
              | Donor Responds:       |  | 15-Minute Escalation |
              | ACCEPTED or REJECTED  |  | (setTimeout + Cron)  |
              +-----------------------+  +----------------------+
                              |                    |
                              v                    v
             +-------------------------+  +---------------------+
             | Auto-Fulfill Check:     |  | Radius widened      |
             | accepted >= units       |  | (+15km, max 100km)  |
             | -> Status: 'FULFILLED'  |  | Alert new donors    |
             +-------------------------+  +---------------------+
```

---

## 2. Biological Blood Compatibility Matrix

A patient requiring blood can only receive red blood cells from compatible donor types according to ABO and Rh antigens. The compatibility logic is strictly enforced in both directions:

### Recipient Compatibility (`RECIPIENT_COMPATIBILITY_MAP`)
Defines which donor blood types an emergency patient can safely receive:

| Patient Blood Group | Compatible Donor Blood Groups | Universal Status |
| :--- | :--- | :--- |
| **O-** | `O-` | Universal Red Cell Donor |
| **O+** | `O+`, `O-` | |
| **A-** | `A-`, `O-` | |
| **A+** | `A+`, `A-`, `O+`, `O-` | |
| **B-** | `B-`, `O-` | |
| **B+** | `B+`, `B-`, `O+`, `O-` | |
| **AB-** | `AB-`, `A-`, `B-`, `O-` | |
| **AB+** | `AB+`, `AB-`, `A+`, `A-`, `B+`, `B-`, `O+`, `O-` | Universal Red Cell Recipient |

### Donor Compatibility (`DONOR_COMPATIBILITY_MAP`)
Defines which emergency patient blood groups a donor can safely give to:
- **O-**: Can donate to all 8 blood groups (`A+`, `A-`, `B+`, `B-`, `AB+`, `AB-`, `O+`, `O-`)
- **O+**: Can donate to `O+`, `A+`, `B+`, `AB+`
- **A-**: Can donate to `A-`, `A+`, `AB-`, `AB+`
- **A+**: Can donate to `A+`, `AB+`
- **B-**: Can donate to `B-`, `B+`, `AB-`, `AB+`
- **B+**: Can donate to `B+`, `AB+`
- **AB-**: Can donate to `AB-`, `AB+`
- **AB+**: Can donate to `AB+` only

---

## 3. Endpoints Overview

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/emergency` | Authenticated | Creates an emergency broadcast, queries compatible donors, alerts them via In-App + Email + Socket.io, and schedules escalation. |
| `GET` | `/api/v1/emergency/nearby` | Authenticated | Returns pending emergencies matching the logged-in donor's blood group compatibility and location. |
| `POST` | `/api/v1/emergency/:id/respond` | Authenticated | Donor submits response (`ACCEPTED` or `REJECTED`). Auto-fulfills when accepted >= units needed. |
| `GET` | `/api/v1/emergency/:id/progress` | Authenticated | Returns real-time metrics: units needed, accepted count, pending count, current radius, escalation level, and masked donor list. |
| `POST` | `/api/v1/emergency/:id/escalate` | Authenticated | Manually or programmatically triggers search radius escalation (+15 km) and alerts new reachable donors. |

---

## 4. Real-Time Socket.io Architecture & Authentication

### JWT Authentication on Handshake (`socketAuthMiddleware`)
Connections to Socket.io are authenticated via JWT tokens passed through:
1. `socket.handshake.auth.token`
2. `socket.handshake.headers['authorization']` (`Bearer <token>`)
3. `socket.handshake.headers.cookie` (`token=<token>`)

```javascript
// Connection validation
io.use(socketAuthMiddleware);
```

### Per-User Room Isolation
Upon successful connection, the server registers the socket into an isolated user room:
- Room Name: `user:<userId>`
- Purpose: Delivers direct alerts to specific users without broadcasting to non-matching clients.

### Socket Events Catalog

| Event Name | Direction | Room / Target | Payload Details |
| :--- | :--- | :--- | :--- |
| `emergency:new` | Server -> Client | `user:<donorId>` | `{ emergencyId, bloodGroup, units, hospitalName, distanceKm, urgency }` |
| `emergency:fulfilled` | Server -> Client | `user:<requesterId>` & `emergency:<id>` | `{ emergencyId, status: 'FULFILLED', units, totalAccepted }` |
| `emergency:escalated` | Server -> Client | `user:<requesterId>` & `emergency:<id>` | `{ emergencyId, newRadiusKm, escalationLevel, additionalNotifiedCount }` |
| `emergency:response` | Server -> Client | `user:<requesterId>` & `emergency:<id>` | `{ emergencyId, donorId, response, totalAccepted, unitsNeeded }` |

---

## 5. Automated Radius Escalation & Background Jobs

1. **In-Memory Escalation Timer (`setTimeout`)**:
   - Each emergency request schedules a 15-minute timer upon creation.
   - If `unitsAccepted < unitsNeeded` when the timer fires, the radius is widened by `+15 km` (up to a ceiling of `100 km`), new donors are queried and notified, and the escalation level is incremented.
2. **Persistent Fallback Cron (`node-cron`)**:
   - Runs every 5 minutes (`*/5 * * * *`).
   - Queries open emergencies created > 15 minutes ago with unfulfilled units whose last escalation occurred over 15 minutes ago.
   - Ensures escalation occurs reliably even if the Node process restarts.
3. **Auto-Fulfillment**:
   - As soon as enough donors submit `ACCEPTED` (`acceptedDonors.length >= unitsNeeded`), the status is updated to `FULFILLED`, `fulfilledAt` timestamp is recorded, the timer is cleared, and real-time fulfillment events are dispatched.

---

## 6. Security, Privacy & Validation

- **Donor Data Masking**: Phone numbers and sensitive contact details in progress reports are masked (`+91 98765*****`) until confirmed assignments take place.
- **Strict Role & Eligibility Enforcement**: Only users with verified donor profiles (`verificationStatus: 'VERIFIED'`, `isAvailable: true`, `isEligible: true`) are notified.
- **State Machine Safeguards**: Prevents donors from accepting already fulfilled or cancelled requests; prevents duplicate responses from the same donor.
