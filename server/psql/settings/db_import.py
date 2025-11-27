#!/usr/bin/env python3
"""
Database Import Script for Team Sharing

This script imports a shared database file from teammates.
Run this when you receive a new database export.

Usage:
    python settings/db_import.py [filename]
    python settings/db_import.py  # Uses latest foodigram_data.sql
"""

import subprocess
import sys
import os
import argparse
import glob
from datetime import datetime
from pathlib import Path

# Load environment variables from .env file if it exists
env_file = Path(__file__).parent / '.env'
if env_file.exists():
    with open(env_file, encoding='utf-8') as f:
        for line in f:
            if line.strip() and not line.startswith('#'):
                key, value = line.strip().split('=', 1)
                os.environ.setdefault(key, value)

def run_command(cmd, description, env=None):
    """Run a shell command and handle errors."""
    print(f"Running: {description}")
    print(f"Command: {' '.join(cmd)}")
    
    try:
        subprocess.run(cmd, check=True, capture_output=True, text=True, encoding='utf-8', env=env)
        print(f"✅ {description} completed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed:")
        print(f"Error: {e.stderr}")
        return False

def find_latest_export():
    """Find the most recent database export file."""
    
    # Look for compressed files first (preferred since compression is default)
    gz_files = glob.glob('db/foodigram_data_*.sql.gz')
    if gz_files:
        latest_gz = max(gz_files, key=os.path.getmtime)
        return latest_gz
    
    # Look for uncompressed files
    sql_files = glob.glob('db/foodigram_data_*.sql')
    if sql_files:
        latest_sql = max(sql_files, key=os.path.getmtime)
        return latest_sql
    
    # Check for the symlink (but prefer compressed version if it exists)
    if os.path.exists('db/foodigram_data.sql.gz'):
        return 'db/foodigram_data.sql.gz'
    elif os.path.exists('db/foodigram_data.sql'):
        return 'db/foodigram_data.sql'
    
    return None

def import_database(filename=None):
    """Import database from SQL file."""
    
    # Ensure we're in the psql directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    psql_dir = os.path.dirname(script_dir)
    os.chdir(psql_dir)
    
    # Database connection parameters (set up early for environment variables)
    use_docker = os.getenv('USE_DOCKER', 'true').lower() == 'true'
    container_name = os.getenv('POSTGRES_CONTAINER', 'foodigram_db')
    
    db_params = {
        'user': 'postgres',
        'host': 'localhost',
        'database': 'foodigram',
        'password': 'postgres'  # Default password for local development
    }
    
    # Set environment variables to avoid password prompts
    env = os.environ.copy()
    if not use_docker:
        env['PGPASSWORD'] = db_params['password']
    
    # Find the file to import
    if filename is None:
        filename = find_latest_export()
        if filename is None:
            print("❌ No database export files found in db/ directory")
            print("Available files:")
            for f in os.listdir('db/'):
                if f.endswith('.sql') or f.endswith('.sql.gz'):
                    print(f"  - {f}")
            return False
        print(f"📁 Using latest export: {filename}")
    
    if not os.path.exists(filename):
        print(f"❌ File not found: {filename}")
        return False
    
    # Handle compressed files
    sql_file = filename
    if filename.endswith('.gz'):
        print("📦 Decompressing file...")
        decompress_cmd = ['gunzip', '-k', filename]
        if not run_command(decompress_cmd, "Decompressing database file", env):
            return False
        sql_file = filename[:-3]  # Remove .gz extension
    
    # Create backup of current data (optional)
    backup_file = f"db/backup_before_import_{datetime.now().strftime('%Y%m%d_%H%M%S')}.sql"
    print(f"💾 Creating backup: {backup_file}")
    
    if use_docker:
        backup_cmd = [
            'docker', 'exec', container_name,
            'pg_dump',
            '-U', db_params['user'],
            '-d', db_params['database'],
            '--data-only',
            '--no-owner',
            '--no-privileges'
        ]
        # Create backup (continue even if this fails)
        try:
            result = subprocess.run(backup_cmd, capture_output=True, text=True, encoding='utf-8', env=env)
            with open(backup_file, 'w', encoding='utf-8') as f:
                f.write(result.stdout)
        except Exception:
            print("⚠️  Warning: Could not create backup")
    else:
        backup_cmd = [
            'pg_dump',
            '-U', db_params['user'],
            '-h', db_params['host'],
            '-d', db_params['database'],
            '--data-only',
            '--no-owner',
            '--no-privileges',
            '-f', backup_file
        ]
        # Create backup (continue even if this fails)
        run_command(backup_cmd, "Creating backup", env)
    
    # Clear existing data (required for data-only imports)
    print("🗑️  Clearing existing data...")
    
    if use_docker:
        clear_cmd = [
            'sudo', 'docker', 'exec', container_name,
            'psql',
            '-U', db_params['user'],
            '-d', db_params['database'],
            '-c', 'DELETE FROM db_menus; DELETE FROM db_restaurants;'
        ]
    else:
        clear_cmd = [
            'psql',
            '-U', db_params['user'],
            '-h', db_params['host'],
            '-d', db_params['database'],
            '-c', 'DELETE FROM db_menus; DELETE FROM db_restaurants;'
        ]
    
    if not run_command(clear_cmd, "Clearing existing data", env):
        print("❌ Error: Could not clear existing data. Import will fail.")
        return False
    
    # Import the new data
    if use_docker:
        # For Docker, we need to pipe the SQL file content into the container
        try:
            print(f"Running: Importing database")
            print(f"Command: docker exec -i {container_name} psql -U {db_params['user']} -d {db_params['database']}")
            
            with open(sql_file, 'r', encoding='utf-8') as f:
                sql_content = f.read()
            
            import_cmd = [
                'sudo', 'docker', 'exec', '-i', container_name,
                'psql',
                '-U', db_params['user'],
                '-d', db_params['database']
            ]
            
            result = subprocess.run(import_cmd, input=sql_content, text=True, encoding='utf-8', check=True, capture_output=True, env=env)
            print(f"✅ Importing database completed successfully")
        except subprocess.CalledProcessError as e:
            print(f"❌ Importing database failed:")
            print(f"Error: {e.stderr}")
            return False
    else:
        import_cmd = [
            'psql',
            '-U', db_params['user'],
            '-h', db_params['host'],
            '-d', db_params['database'],
            '-f', sql_file
        ]
        
        if not run_command(import_cmd, "Importing database", env):
            return False
    
    # Verify import
    if use_docker:
        verify_cmd = [
            'docker', 'exec', container_name,
            'psql',
            '-U', db_params['user'],
            '-d', db_params['database'],
            '-c', 'SELECT COUNT(*) AS restaurants FROM db_restaurants; SELECT COUNT(*) AS menus FROM db_menus;'
        ]
    else:
        verify_cmd = [
            'psql',
            '-U', db_params['user'],
            '-h', db_params['host'],
            '-d', db_params['database'],
            '-c', 'SELECT COUNT(*) AS restaurants FROM db_restaurants; SELECT COUNT(*) AS menus FROM db_menus;'
        ]
    
    print("🔍 Verifying import...")
    subprocess.run(verify_cmd, env=env)
    
    # Show file info
    file_size = os.path.getsize(sql_file) / (1024 * 1024)  # MB
    mod_time = datetime.fromtimestamp(os.path.getmtime(sql_file))
    print(f"📊 Imported file: {sql_file}")
    print(f"📊 File size: {file_size:.1f} MB")
    print(f"📊 File date: {mod_time.strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Cleanup: Remove .sql files and symlinks to .gz files
    print("🧹 Cleaning up temporary files...")
    
    # Remove decompressed .sql files (but keep the original .gz)
    if sql_file.endswith('.sql') and sql_file != filename:
        # Only remove if it's a decompressed file, not the original input
        try:
            os.remove(sql_file)
            print(f"🗑️  Removed decompressed file: {sql_file}")
        except OSError as e:
            print(f"⚠️  Could not remove {sql_file}: {e}")
    
    # Remove symlinks to .gz files in db directory
    db_dir = 'db'
    if os.path.exists(db_dir):
        for item in os.listdir(db_dir):
            item_path = os.path.join(db_dir, item)
            if os.path.islink(item_path) and item.endswith('.gz'):
                try:
                    os.unlink(item_path)
                    print(f"🗑️  Removed symlink: {item_path}")
                except OSError as e:
                    print(f"⚠️  Could not remove symlink {item_path}: {e}")
    
    return True

def main():
    parser = argparse.ArgumentParser(description='Import shared database file')
    parser.add_argument('filename', nargs='?', 
                       help='Database file to import (default: latest export)')
    
    args = parser.parse_args()
    
    print("📥 Starting database import...")
    print("=" * 50)
    
    if import_database(args.filename):
        print("=" * 50)
        print("✅ Database import completed successfully!")
        print("\nNext steps:")
        print("1. Test the application: python testing/integration_test_psql.py")
        print("2. Start Django server: cd .. && python manage.py runserver")
        print("3. Check Django admin: http://localhost:8000/admin/")
    else:
        print("=" * 50)
        print("❌ Database import failed!")
        sys.exit(1)

if __name__ == '__main__':
    main()