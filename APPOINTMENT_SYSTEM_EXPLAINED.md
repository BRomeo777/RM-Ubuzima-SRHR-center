# Appointment System - How It Works

## Overview

When a patient books an appointment, **3 emails are sent** automatically:

1. **Patient** → Gets confirmation email
2. **Admin (You)** → Gets notification at `rmubuzima@gmail.com`
3. **Doctor** → Gets notification at the email you configure

---

## Where Admin Sets Doctor Email

**Location**: Admin Panel → Services Tab → "Book a Doctor" section

```
Admin Panel
    ↓
Services Tab (key: 'services')
    ↓
Book a Doctor Section
    ↓
Input Field: "doctor@example.com"
    ↓
Saved in: bookDoctorEmail (store)
```

**Current Setting**: Check `bookDoctorEmail` in your store

---

## Email Flow When Patient Books

```
PATIENT fills Book Doctor form
    ↓
Clicks "Submit"
    ↓
System creates appointment with reference number
    ↓
System calls sendAppointmentEmail(appointment, bookDoctorEmail)
    ↓
┌─────────────────────────────────────────────┐
│  1. Patient Email (appointment.email)     │
│     → "Your appointment is confirmed!"     │
│     → Shows: date, time, reference #       │
└─────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────┐
│  2. Admin Email (rmubuzima@gmail.com)       │
│     → "New appointment booked"             │
│     → Shows: all patient details           │
└─────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────┐
│  3. Doctor Email (bookDoctorEmail)          │
│     → "New patient appointment"            │
│     → Shows: patient contact info           │
│     → Shows: reason for visit               │
└─────────────────────────────────────────────┘
    ↓
All 3 emails sent successfully!
```

---

## Who Gets What Email

### 1. **Patient Email** (TO: patient email)
```
From: rmubuzima@gmail.com
Subject: Appointment Confirmed - RM Ubuzima
Content:
- Confirmation message
- Doctor name
- Date & time
- Reference number
- Location
- "Manage Appointment" button
```

### 2. **Admin Email** (TO: rmubuzima@gmail.com)
```
From: rmubuzima@gmail.com
Subject: New Appointment: {PatientName} with Doctor
Content:
- Patient name (or "Anonymous")
- Patient email
- Patient phone
- Preferred date & time
- Reference number
- Reason for visit
```

### 3. **Doctor Email** (TO: bookDoctorEmail - configured by admin)
```
From: rmubuzima@gmail.com
Subject: New Appointment: {PatientName} - {Reference}
Content:
- Reference number
- Patient name
- Patient phone
- Patient email
- Date & time
- Reason for visit
- "Please contact the patient to confirm"
```

---

## If Doctor Email is Not Configured

**What happens?**

```
bookDoctorEmail = "" (empty)
    ↓
System logs: "No doctor email configured, skipping doctor notification"
    ↓
Only 2 emails sent:
  ✓ Patient gets confirmation
  ✓ Admin (you) gets notification
  ✗ Doctor doesn't get email
```

**Solution**: Admin must set doctor email in Services tab

---

## Code Flow

### Files Involved:

1. **BookDoctorPage.tsx** (Line 78)
```typescript
await sendAppointmentEmail(appointment, bookDoctorEmail);
```

2. **emailService.ts** (Line 314)
```typescript
export async function sendAppointmentEmail(
  appointment: Appointment, 
  doctorEmail?: string  // ← Optional, from store
): Promise<{ success: boolean; error?: string }> {
  // 1. Send to patient
  const patientResult = await sendAppointmentConfirmation(appointment);
  
  // 2. Send to admin (rmubuzima@gmail.com)
  const adminResult = await notifyAdminAboutAppointment(appointment);
  
  // 3. Send to doctor (only if doctorEmail is set)
  if (doctorEmail) {
    await notifyDoctorAboutAppointment(appointment, doctorEmail);
  }
}
```

3. **AdminPanelPage.tsx** (Line 1191-1198)
```typescript
{/* Services Tab - Book Doctor Section */}
<input
  type="email"
  value={bookDoctorEmail}           // ← This is the doctor email
  onChange={(e) => onSetBookDoctorEmail(e.target.value)}
  placeholder="doctor@example.com"
/>
```

---

## Appointment Data Structure

```typescript
interface Appointment {
  id: string;
  name?: string;              // Patient name (optional if anonymous)
  phone: string;              // Required
  email?: string;             // Patient email (optional but recommended)
  reason: string;             // Why they want to see doctor
  preferredDate: string;      // YYYY-MM-DD format
  preferredTime: string;      // 'morning' | 'afternoon' | 'evening'
  isAnonymous: boolean;       // If true, name is hidden
  status: 'pending' | 'confirmed' | 'cancelled';
  referenceNumber: string;    // Auto-generated (APT-XXXXXX)
  createdAt: string;          // ISO timestamp
}
```

---

## Reference Numbers

Every appointment gets a unique reference:
```
Format: APT-{timestamp}-{random}
Example: APT-1681734567890-7a3b9c
```

Patients use this to:
- Track their appointment
- Reference when calling
- Manage booking

---

## Testing the System

### Test 1: Patient Books with Doctor Email Configured
1. Admin sets doctor email: `drjohn@hospital.com`
2. Patient fills form with email: `patient@gmail.com`
3. Submit
4. Check:
   - `patient@gmail.com` → Should get confirmation
   - `rmubuzima@gmail.com` → Should get notification
   - `drjohn@hospital.com` → Should get notification

### Test 2: Patient Books WITHOUT Doctor Email
1. Admin leaves doctor email empty
2. Patient fills form
3. Submit
4. Check:
   - Patient gets confirmation ✓
   - Admin gets notification ✓
   - Doctor gets nothing (expected)

### Test 3: Anonymous Patient
1. Patient checks "Anonymous" box
2. Submits form
3. Emails show "Anonymous" as patient name
4. But phone/email still included for contact

---

## Troubleshooting

### Emails Not Sending

**Check 1**: Is email server running?
```
Visit: https://rm-ubuzima-email.onrender.com/api/health
Should show: { "status": "OK" }
```

**Check 2**: Is Brevo API key valid?
- Log into Brevo dashboard
- Check sender email is verified
- Check API key hasn't expired

**Check 3**: Check browser console
```javascript
// Look for these logs:
"Appointment email results:"
{ patient: true, admin: true, doctor: true }
```

**Check 4**: Are emails going to spam?
- Check spam/junk folders
- Whitelist `rmubuzima@gmail.com`

### Doctor Not Getting Emails

**Cause 1**: No doctor email configured
- Go to Admin Panel → Services
- Check if "Book a Doctor" email field is filled

**Cause 2**: Invalid email format
- Must be valid email format: `name@domain.com`
- Cannot be empty or have spaces

**Cause 3**: Email server error
- Check server logs on Render dashboard
- Look for error messages

---

## Configuration Checklist

Before appointments work:

- [ ] **Email server deployed** on Render
- [ ] **Brevo API key** configured in environment variables
- [ ] **Sender email** (`rmubuzima@gmail.com`) verified in Brevo
- [ ] **Doctor email** set in Admin Panel → Services
- [ ] **App URL** configured in email server (`https://rm-ubuzima.netlify.app`)
- [ ] **index.html** has EMAIL_API_URL configured

---

## Summary

| Component | Purpose |
|-----------|---------|
| **bookDoctorEmail** | Configured by admin in Services tab |
| **sendAppointmentEmail()** | Sends all 3 emails (patient, admin, doctor) |
| **notifyDoctorAboutAppointment()** | Specifically notifies the doctor |
| **AdminPanelPage.tsx** | Where admin sets doctor email |
| **BookDoctorPage.tsx** | Where patient submits appointment |

**Flow**: Patient books → 3 emails sent → Everyone notified!
