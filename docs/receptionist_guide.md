# Receptionist Operations Guide — Rehab Swat CMS

Welcome to the Rehab Swat CMS receptionist team! This operational manual guides you through day-to-day clinic management workflows. Follow these step-by-step instructions exactly to maintain stellar records and a premium patient experience.

---

## 1. Registering a New Patient
When a patient arrives for their first visit or calls to register, open the **Patients** screen from the sidebar menu.

### Step-by-Step Instructions:
1. Click the **"+ New Patient"** button in the top-right corner of the **Patients** dashboard.
2. The **Register New Patient** modal will slide open.
3. Fill in the following mandatory fields:
   - **Full Name**: Enter the legal name (e.g., `Zubair Khan`).
   - **Phone Number**: Enter in full international format (e.g., `+923001234567` — *crucial for WhatsApp reminders*).
   - **Email Address**: Patient's contact email.
   - **Date of Birth**: Formatted as `DD MMM YYYY` (e.g., `12 May 1985`).
   - **Gender**: Select from dropdown list.
4. Fill in optional clinical context fields:
   - **Allergies**: List any drug or latex allergies (e.g., `None` or `Penicillin`).
   - **Chronic Conditions**: Note active chronic conditions (e.g., `Hypertension`).
   - **Medical History**: Add any surgical or trauma history notes.
5. Click **"Save Patient Record"**.
   - *Duplicate Detection Alert*: If a patient with the exact same name and phone number already exists, a red conflict banner will prompt: `"409 Conflict: Active patient with this name and phone already registered"`. Verify search results before creating duplicates!

---

## 2. Booking a New Appointment
Once a patient record is active, you can schedule their clinical assessment.

### Step-by-Step Instructions:
1. Go to the **Appointments** screen from the sidebar or click **"Book Appointment"** directly from the patient’s profile.
2. Click the **"+ Schedule Appointment"** button.
3. In the scheduling form, fill in:
   - **Patient Name**: Type the name (e.g., `Zubair Khan`) and select from the auto-suggest list.
   - **Doctor**: Select the target practitioner from the dropdown list.
   - **Scheduled Date & Time**: Click the calendar icon and select a valid future slot.
   - **Duration**: Choose standard session durations (e.g., `45 minutes` or `60 minutes`).
   - **Appointment Type**: Select from options like `Initial Assessment` or `Follow-up Therapy`.
4. Click **"Check Availability & Book"**.
   - *Conflict Guard Alert*: The backend runs immediate conflict detection. If the doctor has an overlapping session or if the requested time falls outside their set availability, you will see a warning banner: `"Doctor unavailable during this time slot."` Reschedule with the patient for another time.

---

## 3. Checking Today's Clinic Queue
Managing active patient flows is essential for maintaining on-time sessions.

### Step-by-Step Instructions:
1. Navigate to the **Appointments** screen from the sidebar.
2. Click the **"Today's Queue"** tab at the top of the dashboard.
3. The queue displays all appointments scheduled for the current date (`21 May 2026`).
4. Key indicators you must watch:
   - **Green Badge ("Confirmed")**: Senders have confirmed via Twilio WhatsApp prompts.
   - **Yellow Badge ("Pending")**: Awaiting automatic daily verification.
   - **Red Badge ("Cancelled")**: Cancelled by the staff or patient.
5. As patients arrive, click the **"Mark Arrived"** button to alert the respective doctor in the EMR portal.

---

## 4. Creating an Invoice
Upon completion of a clinical session, you must generate an invoice before the patient departs.

### Step-by-Step Instructions:
1. Open the patient's record in the **Patients** dashboard and select the **Billing** tab, or navigate directly to the **Billing & Invoices** screen.
2. Click **"Create Invoice"**.
3. Under **Service Items**, click **"+ Add Line Item"**:
   - Select the service completed from the catalog (e.g., `Initial Physiotherapy Assessment` — `₨ 3,500`).
   - Add additional lines if multiple therapies were performed (e.g., `Electrotherapy Session` — `₨ 1,500`).
4. If applicable, apply an authorized discount:
   - Enter a percentage in the **"Discount Percent"** field (e.g., type `10` for a 10% discount).
   - The system automatically recalculates the total (e.g., `₨ 5,000` reduced to `₨ 4,500`).
5. Click **"Generate Invoice"**. This saves the invoice with a `PENDING` status.

---

## 5. Recording a Payment
Once the invoice is generated, proceed with payment collection.

### Step-by-Step Instructions:
1. Open the pending invoice in the **Billing & Invoices** screen.
2. Click the **"Record Payment"** button in the invoice view.
3. Select the **Payment Method** from the dropdown:
   - `Cash`
   - `Card (Visa/Mastercard)`
   - `Bank Transfer (EasyPaisa/JazzCash/HBL)`
4. Set the **Paid Amount**. If the patient paid in full, this will match the invoice total.
5. Click **"Submit Payment"**.
6. The invoice status transitions from `PENDING` to `PAID`. Click the **"Print Receipt"** button to hand over a physical receipt or click **"Send via WhatsApp"** to trigger a Twilio automated invoice receipt to the patient.
