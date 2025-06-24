# Database Setup Instructions

## Supabase Setup

1. **Create a Supabase Account**
   - Go to [supabase.com](https://supabase.com)
   - Sign up for a free account
   - Create a new project

2. **Run the Database Schema**
   - Navigate to your Supabase project dashboard
   - Go to the SQL Editor
   - Copy and paste the contents of `schema.sql`
   - Click "Run" to execute the schema

3. **Get Connection Details**
   - Go to Settings → Database
   - Copy the connection details:
     - `SUPABASE_URL`: Your project URL
     - `SUPABASE_ANON_KEY`: Your anon/public key

4. **Configure Environment Variables**
   - Add the connection details to your `.env` file in the backend directory
   - Update the URLs for your deployment environment

## Schema Overview

### Tables

#### `scan_sessions`
- Stores all scan session data
- Uses JSONB for flexible data storage
- Auto-expires sessions after 3 hours
- Tracks scan progress and results

#### `email_list`
- Optional table for collecting user emails
- Used for report delivery feature

### Functions

#### `cleanup_expired_sessions()`
- Removes expired sessions automatically
- Can be called manually or scheduled

#### `cleanup_and_count()`
- Cleanup function that returns count of deleted records
- Can be called via API for monitoring

## Security

- Row Level Security (RLS) is enabled
- Basic policies allow all operations (can be restricted based on requirements)
- Functions are created with SECURITY DEFINER for proper execution

## Maintenance

The database includes automatic cleanup mechanisms:
- Sessions expire after 3 hours
- Cleanup function removes expired data
- Indexes optimize query performance

For production use, consider:
- Implementing more restrictive RLS policies
- Adding monitoring for database usage
- Setting up automated backups
- Monitoring storage usage to stay within free tier limits