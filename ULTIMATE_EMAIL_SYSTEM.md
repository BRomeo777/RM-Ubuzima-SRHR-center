# RM Ubuzima - Ultimate Email System V2

## 🚀 What's New in V2

### Beautiful Email Designs
- **Modern gradient headers** with teal/cyan color scheme
- **Professional card-based layouts**
- **Mobile-responsive HTML templates**
- **Emoji-enhanced content** for better engagement
- **Call-to-action buttons** with hover effects
- **Info boxes** for important alerts (success, warning, danger)

### Anti-Spam Protection
- **Rate limiting**: 10 emails/minute per IP, 5/hour per recipient
- **Spam pattern detection**: Auto-rejects suspicious content
- **Email validation**: RFC 5322 compliant validation
- **Domain restrictions**: Only allows legitimate email providers
- **XSS protection**: HTML sanitization on all inputs
- **Security headers**: X-Content-Type-Options, X-Frame-Options, etc.

### Enhanced Features
- **Email preferences system**: Users can control what they receive
- **Smart notifications**: Debounced messages (5-min delay)
- **Batch operations**: Send multiple emails with rate limiting
- **Email tracking**: Open/click tracking via Brevo
- **Queue system**: Handles spikes with automatic retries
- **Privacy protection**: Email hashing in logs

---

## 📧 Email Types

### 1. Welcome Email
**When**: New user signs up  
**To**: User  
**Contains**:
- Personalized greeting
- Feature highlights
- Getting started button
- Help center link

### 2. Password Reset
**When**: User requests password reset  
**To**: User  
**Contains**:
- Secure reset link (24-hour expiry)
- Fallback URL for copy-paste
- Security warning
- Support contact

### 3. Appointment Confirmation (Patient)
**When**: Patient books appointment  
**To**: Patient  
**Contains**:
- Reference number
- Doctor details
- Date & time
- Location
- Manage appointment button

### 4. Appointment Notification (Admin)
**When**: New appointment booked  
**To**: rmubuzima@gmail.com  
**Contains**:
- Complete patient information
- Appointment details
- Reason for visit
- Link to admin panel

### 5. Appointment Notification (Doctor)
**When**: New appointment booked (if doctor email configured)  
**To**: Configured doctor email  
**Contains**:
- Patient contact info
- Preferred date/time
- Reason for visit
- Direct call button

### 6. New Message (Facilitator)
**When**: User sends message to facilitator  
**To**: Facilitator email  
**Contains**:
- Sender avatar & name
- Message preview
- Quick reply button
- Context (Inbox/Shangazi)

### 7. Security Alert
**When**: Login, password change, suspicious activity  
**To**: User  
**Contains**:
- Device information
- Location
- Timestamp
- Action buttons

### 8. Weekly Digest (Facilitators)
**When**: Weekly summary  
**To**: Facilitators who opt-in  
**Contains**:
- Message count stats
- Users helped count
- Dashboard link
- Motivational message

### 9. Facilitator Request (Admin)
**When**: User applies to be facilitator  
**To**: Admin  
**Contains**:
- Requester details
- Reason for request
- Review link

---

## 🎨 Design System

### Colors
```css
Primary: #0d9488 (Teal)
Secondary: #0891b2 (Cyan)
Accent: #f59e0b (Amber)
Success: #10b981 (Green)
Warning: #f59e0b (Amber)
Danger: #ef4444 (Red)
```

### Typography
- Font: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif
- Base size: 16px
- Headings: 600 weight
- Body: 400 weight

### Components
- **Buttons**: Gradient background, rounded corners, shadow
- **Cards**: White background, rounded corners, subtle shadow
- **Info Boxes**: Left border accent, light background
- **Data Rows**: Two-column layout with label and value

---

## 🔒 Security Features

### Rate Limiting
```javascript
Global: 200 emails/minute total
Per IP: 10 emails/minute
Per Email: 5 emails/hour
Password Reset: 3 attempts/hour
```

### Spam Detection
```javascript
Score > 20 = Blocked
- Suspicious keywords: +10 points
- Excessive caps (>70%): +15 points
- Suspicious URLs: +20 points
```

### Email Validation
- RFC 5322 compliant regex
- Length check (max 254 chars)
- Domain verification
- Disposable email detection

### Input Sanitization
```javascript
< → &lt;
> → &gt;
" → &quot;
' → &#x27;
/ → &#x2F;
```

---

## ⚙️ Email Preferences

Users can control their notifications:

```typescript
interface EmailPreferences {
  appointmentConfirmations: boolean;  // Default: true
  newMessages: boolean;                 // Default: true
  facilitatorNotifications: boolean;    // Default: true
  securityAlerts: boolean;              // Default: true
  weeklyDigest: boolean;                // Default: false
  marketingEmails: boolean;             // Default: false
}
```

### Storage
- Saved in localStorage
- Key: `rm-ubuzima-email-preferences`
- Merged with defaults on load

---

## 🛠️ API Endpoints

### Public Endpoints

```http
POST /api/send-welcome
POST /api/send-password-reset
POST /api/send-appointment-confirmation
POST /api/notify-admin-appointment
POST /api/notify-doctor
POST /api/notify-new-message
```

### Admin Endpoints (requires API key)

```http
POST /api/send-email
POST /api/webhook/email-event
GET  /api/stats
```

### Health Check

```http
GET /api/health
```

Response:
```json
{
  "status": "OK",
  "version": "2.0.0",
  "timestamp": "2026-04-16T10:00:00Z",
  "uptime": 86400,
  "queueSize": 0
}
```

---

## 📦 Frontend Integration

### Installation
```typescript
import {
  // Basic emails
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendAppointmentEmail,
  
  // Notifications
  notifyFacilitatorOfNewMessage,
  sendSecurityAlert,
  sendWeeklyDigest,
  
  // Preferences
  getEmailPreferences,
  saveEmailPreferences,
  isEmailEnabled,
  
  // Utilities
  getEmailServerStatus,
  maskEmail,
  isValidEmailFormat
} from './services/emailService';
```

### Usage Examples

```typescript
// Send welcome email
await sendWelcomeEmail('user@example.com', 'John Doe');

// Send appointment notifications
await sendAppointmentEmail(appointment, doctorEmail);

// Notify facilitator of new message
await notifyFacilitatorOfNewMessage(
  'facilitator@example.com',
  'Jane Smith',
  'John Doe',
  'Hello, I need help with...',
  'inbox'
);

// Check preferences before sending
if (isEmailEnabled('securityAlerts')) {
  await sendSecurityAlert(email, name, 'login', device, location, time);
}

// Update preferences
saveEmailPreferences({
  newMessages: false,
  weeklyDigest: true
});
```

---

## 🚀 Deployment

### Environment Variables

```bash
# Required
BREVO_API_KEY=your-brevo-api-key

# Optional (defaults provided)
FROM_EMAIL=rmubuzima@gmail.com
FROM_NAME=RM Ubuzima
APP_URL=https://rm-ubuzima.netlify.app
ADMIN_EMAIL=rmubuzima@gmail.com
ADMIN_API_KEY=your-admin-secret-key
EMAIL_WEBHOOK_SECRET=random-secret-for-webhooks

# Rate limiting
ALLOWED_DOMAINS=gmail.com,yahoo.com,outlook.com,co.rw
```

### Deploy to Render

1. Push code to GitHub
2. Create new Web Service on Render
3. Set environment variables
4. Deploy!

### Update Frontend

Update `index.html`:
```html
<script>
  window.EMAIL_API_URL = 'https://your-email-server.onrender.com/api';
</script>
```

---

## 📊 Monitoring

### Health Check
```bash
curl https://your-email-server.onrender.com/api/health
```

### Stats (Admin only)
```bash
curl -H "X-API-Key: your-admin-key" \
  https://your-email-server.onrender.com/api/stats
```

### Logs
- Request ID tracking
- Response times
- Email delivery status
- Queue size
- Rate limit hits

---

## 🔧 Troubleshooting

### Emails Not Sending
1. Check health endpoint
2. Verify Brevo API key
3. Check sender email verification
4. Review rate limits

### Going to Spam
1. Verify DKIM/SPF records
2. Use consistent sender name
3. Avoid spam trigger words
4. Check engagement rates

### Rate Limited
- Check client IP rate limits
- Implement client-side debouncing
- Use batch operations for bulk

---

## 📈 Performance

### Queue System
- Processes 5 emails at a time
- 1-second delay between batches
- 3 retry attempts with exponential backoff
- Automatic cleanup of old entries

### Memory Management
- Rate limit cleanup every 10 minutes
- Email tracking limited to last 1000
- Queue size monitoring

---

## 🎯 Best Practices

### Do:
- ✓ Always check email preferences before sending
- ✓ Use debouncing for message notifications
- ✓ Handle errors gracefully
- ✓ Mask emails in logs
- ✓ Validate inputs

### Don't:
- ✗ Send emails in loops without batching
- ✗ Ignore rate limit errors
- ✗ Send sensitive data in email bodies
- ✗ Use for marketing without opt-in
- ✗ Block UI on email sending

---

## 📝 Changelog

### V2.0.0 - Ultimate Edition
- ✨ Beautiful HTML email templates
- 🛡️ Anti-spam protection
- ⚡ Smart notification system
- 🎨 Modern design system
- 📊 Email tracking & analytics
- ⚙️ User preferences
- 🔄 Batch operations
- 🔒 Enhanced security

---

## 🤝 Support

For issues or questions:
- Check health endpoint
- Review server logs
- Contact: rmubuzima@gmail.com

---

**Built with 💚 for RM Ubuzima**
