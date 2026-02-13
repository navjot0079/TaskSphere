# Deadline Reminder System

## Overview
The Task Manager now includes an automatic deadline reminder system that sends notifications to users before their tasks become overdue.

## Features

### 🔔 Automatic Reminders
- **24 hours before**: First reminder when task is due in 24 hours
- **3 hours before**: Second reminder when task is due in 3 hours
- **1 hour before**: Final reminder when task is due in 1 hour
- **Overdue**: Alert when task becomes overdue

### ⚡ Real-time Notifications
- Notifications appear in the notification bell (top right)
- Real-time delivery via WebSocket for online users
- Notifications persist in database for offline users

### 🎯 Smart Tracking
- Prevents duplicate notifications using `remindersSent` tracking
- Only sends reminders for tasks that are:
  - Not completed (`status: todo, in-progress, review`)
  - Have an assigned user
  - Have a valid `dueDate`
  - Not archived

## How It Works

### 1. Cron Job Scheduling
```javascript
// Runs every 15 minutes
cron.schedule('*/15 * * * *', async () => {
    await checkDeadlines(io);
});
```

### 2. Deadline Check Process
```
Check all active tasks
  ↓
For each task with upcoming deadline
  ↓
Check if reminder already sent for this interval
  ↓
If not sent:
  - Create notification in database
  - Send real-time notification via WebSocket (if user online)
  - Mark reminder as sent in task.remindersSent
```

### 3. Notification Types

| Type | Icon | Trigger | Priority |
|------|------|---------|----------|
| `task_due_soon` | ⏰ | 24h, 3h, 1h before | Medium |
| `task_overdue` | 🚨 | After deadline passes | High |

## Testing the System

### Method 1: Create a Test Task (Recommended)

1. **Login as any user** (Admin or regular user)

2. **Create or edit a task** with a due date:
   ```javascript
   // Example: Set due date to 24 hours from now
   dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000)
   ```

3. **Wait for cron job** (runs every 15 minutes)
   - Or manually trigger (see Method 2)

4. **Check notifications**:
   - Bell icon in top right
   - Should show "⏰ Task Deadline Reminder"

### Method 2: Manual Trigger (Admin Only)

Use the admin endpoint to immediately trigger deadline check:

**Endpoint:**
```
POST /api/admin/trigger-deadline-check
```

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
    "success": true,
    "message": "Deadline check completed",
    "remindersSent": 3
}
```

**Using curl:**
```bash
curl -X POST http://localhost:5000/api/admin/trigger-deadline-check \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Using Postman:**
1. Create new POST request
2. URL: `http://localhost:5000/api/admin/trigger-deadline-check`
3. Add Authorization header with admin token
4. Send request

### Method 3: Console Testing

In Node.js console or backend code:
```javascript
import { checkDeadlines } from './utils/deadlineReminder.js';

// Manually run check
await checkDeadlines(io);
```

## Database Structure

### Task Model Addition
```javascript
remindersSent: [{
    type: { 
        type: String, 
        enum: ['24h', '3h', '1h', 'overdue'] 
    },
    sentAt: { 
        type: Date, 
        default: Date.now 
    }
}]
```

### Notification Schema
```javascript
{
    recipient: ObjectId,        // User receiving notification
    type: 'task_due_soon',      // or 'task_overdue'
    title: '⏰ Task Deadline Reminder',
    message: 'Task "..." is due in X hours!',
    link: '/tasks/:id',         // Direct link to task
    relatedTask: ObjectId,
    isRead: false
}
```

## Configuration

### Adjust Reminder Intervals
Edit `backend/utils/deadlineReminder.js`:

```javascript
const reminderIntervals = [
    { type: '48h', hours: 48, milliseconds: 48 * 60 * 60 * 1000 }, // 2 days
    { type: '24h', hours: 24, milliseconds: 24 * 60 * 60 * 1000 }, // 1 day
    { type: '6h', hours: 6, milliseconds: 6 * 60 * 60 * 1000 },    // 6 hours
    { type: '1h', hours: 1, milliseconds: 1 * 60 * 60 * 1000 },    // 1 hour
];
```

### Change Cron Schedule
Edit `backend/server.js`:

```javascript
// Run every 5 minutes
cron.schedule('*/5 * * * *', async () => { ... });

// Run every hour
cron.schedule('0 * * * *', async () => { ... });

// Run every day at 9 AM
cron.schedule('0 9 * * *', async () => { ... });
```

**Cron Pattern Reference:**
```
* * * * *
│ │ │ │ │
│ │ │ │ └── Day of week (0-7, 0 or 7 = Sunday)
│ │ │ └──── Month (1-12)
│ │ └────── Day of month (1-31)
│ └──────── Hour (0-23)
└────────── Minute (0-59)
```

## Example Scenarios

### Scenario 1: Upcoming Task
```
Current Time: Feb 10, 2026 10:00 AM
Task Due Date: Feb 11, 2026 10:00 AM

Reminders that will be sent:
✅ 24h reminder: Feb 10, 2026 10:00 AM ← NOW
⏰ 3h reminder:  Feb 11, 2026 7:00 AM
⏰ 1h reminder:  Feb 11, 2026 9:00 AM
```

### Scenario 2: Overdue Task
```
Current Time: Feb 10, 2026 10:00 AM
Task Due Date: Feb 10, 2026 8:00 AM

Notification:
🚨 Task Overdue: "Task '...' is now 2 hours overdue!"
```

### Scenario 3: Multiple Tasks
```
User has 5 tasks with different deadlines:
- Task A: Due in 25 hours → No reminder yet
- Task B: Due in 24 hours → 24h reminder sent ✅
- Task C: Due in 3 hours  → 3h reminder sent ✅
- Task D: Due in 1 hour   → 1h reminder sent ✅
- Task E: Overdue 2 hours → Overdue alert sent 🚨

Total reminders sent: 4
```

## Monitoring

### Server Logs
The system logs all activity:

```bash
🔔 Running deadline check...
📨 Sent 24h reminder for task: Implement Login to John Doe
📨 Sent 3h reminder for task: Update Documentation to Jane Smith
🚨 Sent overdue notification for task: Fix Bug #123 to Bob Johnson
✅ Deadline check completed. Sent 3 reminders.
```

### Check Task Reminders
In MongoDB or via API:
```javascript
// Find task and check remindersSent
const task = await Task.findById(taskId);
console.log(task.remindersSent);
// Output:
// [
//   { type: '24h', sentAt: '2026-02-09T10:00:00Z' },
//   { type: '3h', sentAt: '2026-02-10T07:00:00Z' }
// ]
```

## Troubleshooting

### No Notifications Received

**Check 1: Is the cron job running?**
```bash
# Look for this in server logs:
⏰ Deadline reminder cron job started (runs every 15 minutes)
```

**Check 2: Are there tasks with upcoming deadlines?**
```javascript
// Query tasks that should trigger reminders
db.tasks.find({
    status: { $in: ['todo', 'in-progress', 'review'] },
    dueDate: { $gte: new Date(), $lte: new Date(Date.now() + 25*60*60*1000) },
    assignedTo: { $exists: true }
})
```

**Check 3: Is the user online?**
```javascript
// Check active users map
console.log(io.activeUsers);
```

**Check 4: Were reminders already sent?**
```javascript
// Check task.remindersSent array
const task = await Task.findById(taskId);
console.log(task.remindersSent);
```

### Duplicate Notifications

**Solution:** Clear `remindersSent` array:
```javascript
// MongoDB
db.tasks.updateMany(
    {},
    { $set: { remindersSent: [] } }
)
```

### Cron Job Not Running

**Check node-cron installation:**
```bash
cd backend
npm list node-cron
```

**Restart server:**
```bash
npm run dev
```

## Benefits

✅ **Never miss deadlines**: Automatic reminders keep users informed
✅ **Improved productivity**: Multiple reminder intervals ensure timely action
✅ **Reduced overdue tasks**: Early warnings prevent tasks from becoming overdue
✅ **No manual effort**: Fully automated with cron job
✅ **Real-time delivery**: Instant notifications for online users
✅ **Persistent storage**: Notifications saved for offline users
✅ **No duplicates**: Smart tracking prevents reminder spam

## Dependencies

- **node-cron**: `^3.0.3` - Task scheduling
- **socket.io**: `^4.6.1` - Real-time notifications
- **mongoose**: `^8.0.3` - Database operations

## Future Enhancements

- ⭐ Email reminders in addition to in-app notifications
- ⭐ Customizable reminder intervals per user
- ⭐ SMS notifications for critical tasks
- ⭐ Weekly digest of upcoming deadlines
- ⭐ Slack/Teams integration
- ⭐ Reminder preferences in user settings
- ⭐ Snooze/dismiss functionality

---

**Last Updated:** February 10, 2026
**Version:** 1.0.0
