#!/usr/bin/env python3
"""
BreakFree - Role Update Utility

This script updates existing user roles in the database:
- "facilitator" → "psychometrician"
- "caseworker" → "house_worker"

Usage:
    python update_roles.py --dry-run (to see what would be changed)
    python update_roles.py --update (to actually update the database)
"""

import argparse
import sys
import os
from datetime import datetime

# Add the current directory to Python path to import firebase_config
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from firebase_config import db

def list_users_with_old_roles():
    """List all users with old roles that need to be updated"""
    try:
        users_ref = db.collection('users')
        users = users_ref.stream()
        
        old_role_users = []
        for user in users:
            user_data = user.to_dict()
            role = user_data.get('role')
            
            if role in ['facilitator', 'caseworker']:
                old_role_users.append({
                    'id': user.id,
                    'email': user_data.get('email', 'Unknown'),
                    'current_role': role,
                    'new_role': 'psychometrician' if role == 'facilitator' else 'house_worker',
                    'created_at': user_data.get('created_at'),
                    'status': user_data.get('status', 'active')
                })
        
        if not old_role_users:
            print("No users found with old roles that need updating.")
            return []
        
        print(f"\nFound {len(old_role_users)} users with old roles:")
        print("-" * 120)
        print(f"{'ID':<20} {'Email':<35} {'Current Role':<15} {'New Role':<15} {'Status':<10} {'Created':<20}")
        print("-" * 120)
        
        for user in old_role_users:
            created_at = user['created_at']
            if created_at:
                if hasattr(created_at, 'strftime'):
                    created_str = created_at.strftime('%Y-%m-%d %H:%M')
                else:
                    created_str = str(created_at)
            else:
                created_str = 'N/A'
            
            print(f"{user['id']:<20} {user['email']:<35} {user['current_role']:<15} {user['new_role']:<15} {user['status']:<10} {created_str:<20}")
        
        print("-" * 120)
        return old_role_users
        
    except Exception as e:
        print(f"Error listing users with old roles: {str(e)}")
        return []

def update_user_roles(dry_run=True):
    """Update user roles from old to new roles"""
    try:
        users_ref = db.collection('users')
        users = users_ref.stream()
        
        updated_count = 0
        errors = []
        
        for user in users:
            user_data = user.to_dict()
            role = user_data.get('role')
            
            if role in ['facilitator', 'caseworker']:
                new_role = 'psychometrician' if role == 'facilitator' else 'house_worker'
                
                if dry_run:
                    print(f"Would update: {user_data.get('email')} ({role} → {new_role})")
                    updated_count += 1
                else:
                    try:
                        # Update the user's role
                        user_ref = users_ref.document(user.id)
                        user_ref.update({
                            'role': new_role,
                            'role_updated_at': datetime.now(),
                            'previous_role': role
                        })
                        
                        print(f"Updated: {user_data.get('email')} ({role} → {new_role})")
                        updated_count += 1
                        
                    except Exception as e:
                        error_msg = f"Error updating {user_data.get('email')}: {str(e)}"
                        print(error_msg)
                        errors.append(error_msg)
        
        if dry_run:
            print(f"\nDry run completed: {updated_count} users would be updated.")
        else:
            print(f"\nUpdate completed: {updated_count} users updated successfully.")
            
            if errors:
                print(f"\nErrors encountered: {len(errors)}")
                for error in errors:
                    print(f"  - {error}")
        
        return updated_count, errors
        
    except Exception as e:
        print(f"Error updating user roles: {str(e)}")
        return 0, [str(e)]

def main():
    parser = argparse.ArgumentParser(description='Update user roles in BreakFree database')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be changed without making changes')
    parser.add_argument('--update', action='store_true', help='Actually update the database')
    
    args = parser.parse_args()
    
    if not args.dry_run and not args.update:
        print("Please specify either --dry-run or --update")
        parser.print_help()
        return
    
    print("BreakFree Role Update Utility")
    print("=" * 50)
    print("This will update user roles:")
    print("  - 'facilitator' → 'psychometrician'")
    print("  - 'caseworker' → 'house_worker'")
    print()
    
    # List users with old roles
    old_role_users = list_users_with_old_roles()
    
    if not old_role_users:
        print("No users need to be updated.")
        return
    
    if args.dry_run:
        print("\nPerforming dry run...")
        update_user_roles(dry_run=True)
        
    elif args.update:
        print(f"\nAbout to update {len(old_role_users)} users.")
        confirm = input("Do you want to proceed with the update? (y/N): ")
        
        if confirm.lower() != 'y':
            print("Update cancelled.")
            return
        
        print("\nUpdating user roles...")
        updated_count, errors = update_user_roles(dry_run=False)
        
        if updated_count > 0:
            print(f"\n✅ Successfully updated {updated_count} users!")
            print("\nNote: Users with old roles will need to log out and log back in to see the updated interface.")
        
        if errors:
            print(f"\n⚠️  {len(errors)} errors occurred during the update.")

if __name__ == '__main__':
    main()
