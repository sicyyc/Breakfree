# BreakFree System Setup Summary

## Overview
The BreakFree system has been successfully separated into two distinct applications:

1. **Main System (In-house)**: Port 5000 - For in-house treatment management
2. **Aftercare System**: Port 5001 - For aftercare client management

## System Architecture

### Main System (In-house) - Port 5000
- **Purpose**: Manages clients during their in-house treatment phase
- **Access**: http://localhost:5000
- **Roles**: Admin, Caseworker
- **Features**: 
  - Client management for in-house treatment
  - Progress tracking
  - Treatment planning
  - Discharge preparation

### Aftercare System - Port 5001
- **Purpose**: Manages clients after they complete in-house treatment
- **Access**: http://localhost:5001
- **Roles**: Admin, Caseworker (aftercare-specific)
- **Features**:
  - Aftercare client management
  - Check-in system
  - Progress monitoring
  - Success rate tracking
  - Aftercare-specific reporting

## Client Transfer Process

### From In-house to Aftercare
1. **In-house Admin Review**: Admin reviews client progress in main system
2. **Approval**: If client is ready for aftercare, admin approves transfer
3. **Transfer**: Use the transfer utility to move client to aftercare system
4. **Aftercare Management**: Client is now managed in the aftercare system

### Transfer Utility
Located at: `aftercare_system/transfer_clients.py`

**Usage:**
```bash
cd aftercare_system
python transfer_clients.py --list-pending    # List clients ready for transfer
python transfer_clients.py --transfer-all    # Transfer all pending clients
python transfer_clients.py --transfer <client_id>  # Transfer specific client
```

## Database Structure

Both systems share the same Firebase Firestore database with the following collections:

- **clients**: Client information with `care_type` field
  - `care_type: 'in_house'` - Managed by main system
  - `care_type: 'after_care'` - Managed by aftercare system
- **users**: User accounts with role-based access
- **check_ins**: Check-in records (aftercare system)
- **interventions**: Treatment records (main system)

## Starting the Systems

### Main System
```bash
cd /path/to/BreakFree_clean
python app.py
```
Access at: http://localhost:5000

### Aftercare System
```bash
cd /path/to/BreakFree_clean/aftercare_system
python start_aftercare.py
```
Access at: http://localhost:5001

## User Roles and Access

### Main System Users
- **Admin**: Full access to in-house client management
- **Caseworker**: Limited access to assigned clients

### Aftercare System Users
- **Admin**: Full access to aftercare client management
- **Caseworker**: Access to aftercare client check-ins and monitoring

## Key Features by System

### Main System Features
- Client intake and registration
- Treatment planning and progress tracking
- Intervention management
- Discharge planning
- In-house reporting

### Aftercare System Features
- Aftercare client profiles
- Check-in system with location tracking
- Progress monitoring
- Success rate analytics
- Aftercare-specific reporting

## Security and Access Control

- Both systems use Firebase Authentication
- Role-based access control implemented
- Session management for user authentication
- Separate login systems for each application

## File Structure

```
BreakFree_clean/
├── app.py                    # Main system Flask app
├── firebase_config.py        # Firebase configuration
├── templates/                # Main system templates
├── static/                   # Main system assets
└── aftercare_system/         # Aftercare system
    ├── aftercare_app.py      # Aftercare Flask app
    ├── firebase_config.py    # Firebase configuration (shared)
    ├── start_aftercare.py    # Startup script
    ├── transfer_clients.py   # Client transfer utility
    ├── templates/            # Aftercare templates
    └── static/               # Aftercare assets
```

## Troubleshooting

### Common Issues
1. **Port Conflicts**: Ensure ports 5000 and 5001 are available
2. **Firebase Configuration**: Both systems use the same Firebase project
3. **User Access**: Users must have appropriate roles in Firebase
4. **Client Transfer**: Use the transfer utility for proper client migration

### Support
- Check the README.md files in each system directory
- Verify Firebase configuration is correct
- Ensure all dependencies are installed

## Next Steps

1. **User Setup**: Create user accounts with appropriate roles
2. **Client Migration**: Transfer existing clients as needed
3. **Training**: Train staff on both systems
4. **Monitoring**: Monitor system performance and usage



