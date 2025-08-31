# Activity Log Feature

## Overview

The Activity Log feature provides comprehensive tracking and monitoring of all user activities across the BreakFree system. This feature is exclusively available to admin users and helps maintain audit trails for security and compliance purposes.

## Features

### 🔍 **Activity Tracking**
- **User Actions**: Login, logout, client management, user management
- **System Operations**: Data exports, report generation, settings changes
- **Client Operations**: Creation, approval, rejection, archiving, flagging
- **User Management**: User creation, updates, deletion

### 📊 **Advanced Filtering**
- **User Filter**: Filter activities by specific users
- **Action Filter**: Filter by type of action performed
- **Date Filter**: Filter activities by specific dates
- **Real-time Search**: Search through activity details

### 📈 **Statistics Dashboard**
- Total activities count
- Active users count
- Action types count
- Visual statistics cards

### 📋 **Detailed Information**
- **User Details**: Email, role, avatar
- **Action Details**: Description of what was performed
- **Target Information**: What object was affected
- **Timestamps**: Exact date and time of activity
- **IP Addresses**: Source IP for security tracking
- **User Agents**: Browser/client information

### 📤 **Export Functionality**
- Export filtered activities to CSV
- Include all relevant data fields
- Timestamped filename generation

## Access

### Admin Access Only
The Activity Log is only accessible to users with the `admin` role. Other roles (psychometrician, house_worker) cannot access this feature.

### Navigation
- Located in the sidebar navigation
- Icon: Clock (🕐)
- Label: "Activity Log"

## Database Structure

### Collection: `activity_logs`

Each activity log entry contains:

```json
{
  "user_id": "string",
  "user_email": "string", 
  "user_role": "string",
  "action": "string",
  "details": "string",
  "target_id": "string",
  "target_type": "string",
  "timestamp": "datetime",
  "ip_address": "string",
  "user_agent": "string"
}
```

### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `user_id` | String | Unique identifier of the user who performed the action |
| `user_email` | String | Email address of the user |
| `user_role` | String | Role of the user (admin, psychometrician, house_worker) |
| `action` | String | Type of action performed |
| `details` | String | Detailed description of the action |
| `target_id` | String | ID of the object affected (client, user, etc.) |
| `target_type` | String | Type of object affected (client, user, etc.) |
| `timestamp` | DateTime | When the action was performed |
| `ip_address` | String | IP address of the user's device |
| `user_agent` | String | Browser/client information |

## Tracked Actions

### Authentication
- **Login**: User successfully logs into the system
- **Logout**: User logs out of the system

### Client Management
- **Create Client**: New client assessment is created
- **Approve Client**: Client is approved for treatment
- **Reject Client**: Client application is rejected
- **Archive Client**: Client record is archived
- **Flag Client**: Client is flagged for review
- **Send to Aftercare**: Client is transferred to aftercare
- **Complete Treatment**: Client treatment is marked as completed

### User Management
- **Create User**: New user account is created
- **Update User**: User information or permissions are updated
- **Delete User**: User account is deleted

### System Operations
- **View Reports**: System reports are accessed
- **Export Data**: Data is exported from the system

## Implementation Details

### Logging Function

The system uses a centralized `log_activity()` function:

```python
def log_activity(user_id, user_email, user_role, action, details=None, target_id=None, target_type=None):
    # Logs activity to Firestore
```

### Automatic Logging

Activities are automatically logged when:
- Users log in/out
- Clients are created, approved, rejected, or archived
- Users are created, updated, or deleted
- System operations are performed

### Manual Logging

Additional activities can be logged manually by calling:

```python
log_activity(
    user_id=session['user_id'],
    user_email=session['email'],
    user_role=session['role'],
    action='Custom Action',
    details='Description of the action',
    target_id='object_id',
    target_type='object_type'
)
```

## API Endpoints

### Activity Log Page
- **Route**: `/activity-log`
- **Method**: GET
- **Access**: Admin only
- **Description**: Main activity log page with filtering and pagination

### Check for Updates
- **Route**: `/api/activity-log/check-updates`
- **Method**: GET
- **Access**: Admin only
- **Description**: Check for new activities since last view

### Export Activities
- **Route**: `/api/activity-log/export`
- **Method**: POST
- **Access**: Admin only
- **Description**: Export filtered activities to CSV

### Activity Statistics
- **Route**: `/api/activity-log/stats`
- **Method**: GET
- **Access**: Admin only
- **Description**: Get activity statistics and analytics

## Setup and Testing

### Populate Sample Data

To populate the activity logs with sample data for testing:

```bash
python populate_activity_logs.py
```

This script will create 200 sample activity logs spanning the past 30 days.

### Manual Testing

1. **Login as Admin**: Access the system with admin credentials
2. **Navigate to Activity Log**: Click on "Activity Log" in the sidebar
3. **Test Filters**: Try filtering by user, action, and date
4. **Test Export**: Use the export button to download CSV
5. **Test Search**: Use the search functionality to find specific activities

## Security Considerations

### Data Privacy
- Activity logs contain sensitive information
- Access is restricted to admin users only
- IP addresses are logged for security purposes
- User agent strings help identify client devices

### Data Retention
- Activity logs are stored indefinitely
- Consider implementing data retention policies
- Regular backups should include activity logs

### Audit Trail
- All admin actions are logged
- No admin action can bypass logging
- Logs provide complete audit trail for compliance

## Future Enhancements

### Planned Features
- **Real-time Notifications**: Notify admins of suspicious activities
- **Activity Analytics**: Charts and graphs for activity patterns
- **Advanced Filtering**: More granular filtering options
- **Bulk Operations**: Bulk export and management of logs
- **Integration**: Integration with external security systems

### Performance Optimizations
- **Pagination**: Efficient handling of large log volumes
- **Indexing**: Database indexing for faster queries
- **Caching**: Cache frequently accessed log data
- **Compression**: Compress old log data for storage efficiency

## Troubleshooting

### Common Issues

1. **No Activities Showing**
   - Check if the `activity_logs` collection exists in Firestore
   - Verify admin permissions
   - Run the populate script to add sample data

2. **Export Not Working**
   - Check browser console for errors
   - Verify network connectivity
   - Ensure sufficient data exists for export

3. **Filters Not Working**
   - Clear browser cache
   - Check URL parameters
   - Verify filter values match existing data

### Debug Mode

Enable debug logging by adding to `app.py`:

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

## Support

For issues or questions regarding the Activity Log feature:

1. Check the browser console for JavaScript errors
2. Review the Flask application logs
3. Verify Firestore permissions and connectivity
4. Contact the development team with specific error messages
