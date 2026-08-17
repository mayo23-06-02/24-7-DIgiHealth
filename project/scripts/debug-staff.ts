/**
 * Debug script to check staff and user mappings in PostgreSQL
 * Run with: npx tsx scripts/debug-staff.ts
 */

import { getSupabaseAdmin } from '../lib/supabase/server';
import { connectToDatabase } from '../lib/mongodb';
import { StaffApprovalRequest } from '../lib/models/StaffApprovalRequest';
import User from '../lib/models/User';

async function debugStaff() {
  console.log('=== Debugging Staff and User Mappings ===\n');

  const supabase = getSupabaseAdmin();

  // 1. Check all users in PostgreSQL
  console.log('1. PostgreSQL Users:');
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, email, first_name, last_name, mongo_id, role')
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (usersError) {
    console.error('Error fetching users:', usersError);
  } else {
    console.log(`Found ${users?.length || 0} users:`);
    users?.forEach(u => {
      console.log(`  - ${u.email} (${u.first_name} ${u.last_name})`);
      console.log(`    Postgres ID: ${u.id}`);
      console.log(`    Mongo ID: ${u.mongo_id || 'NOT SET'}`);
      console.log(`    Role: ${u.role}`);
    });
  }

  // 2. Check all staff in PostgreSQL
  console.log('\n2. PostgreSQL Staff:');
  const { data: staff, error: staffError } = await supabase
    .from('staff')
    .select('*, users(first_name, last_name, email, mongo_id), facilities(name)')
    .order('created_at', { ascending: false });
  
  if (staffError) {
    console.error('Error fetching staff:', staffError);
  } else {
    console.log(`Found ${staff?.length || 0} staff members:`);
    staff?.forEach(s => {
      console.log(`  - ${s.users?.first_name} ${s.users?.last_name} (${s.users?.email})`);
      console.log(`    Staff ID: ${s.id}`);
      console.log(`    User ID: ${s.user_id}`);
      console.log(`    Facility ID: ${s.facility_id}`);
      console.log(`    Facility: ${s.facilities?.name || 'Unknown'}`);
      console.log(`    Role: ${s.role}`);
      console.log(`    Department: ${s.department}`);
    });
  }

  // 3. Check pending approval requests in MongoDB
  console.log('\n3. MongoDB Staff Approval Requests:');
  await connectToDatabase();
  const approvalRequests = await StaffApprovalRequest.find({})
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();
  
  console.log(`Found ${approvalRequests.length} approval requests:`);
  for (const req of approvalRequests) {
    console.log(`  - Request ID: ${req._id}`);
    console.log(`    Doctor ID (Mongo): ${req.doctorId}`);
    console.log(`    Facility ID (Mongo): ${req.facilityId}`);
    console.log(`    Status: ${req.status}`);
    console.log(`    Department: ${req.department}`);
    console.log(`    Expires: ${req.expiresAt}`);
    
    // Try to find the doctor in MongoDB
    const doctor = await User.findById(req.doctorId).select('firstName lastName email').lean();
    if (doctor) {
      console.log(`    Doctor: ${doctor.firstName} ${doctor.lastName} (${doctor.email})`);
    }
  }

  // 4. Check facilities in PostgreSQL
  console.log('\n4. PostgreSQL Facilities:');
  const { data: facilities, error: facilitiesError } = await supabase
    .from('facilities')
    .select('id, name, mongo_id')
    .order('created_at', { ascending: false });
  
  if (facilitiesError) {
    console.error('Error fetching facilities:', facilitiesError);
  } else {
    console.log(`Found ${facilities?.length || 0} facilities:`);
    facilities?.forEach(f => {
      console.log(`  - ${f.name}`);
      console.log(`    Postgres ID: ${f.id}`);
      console.log(`    Mongo ID: ${f.mongo_id || 'NOT SET'}`);
    });
  }

  // 5. Check hospital admin profiles
  console.log('\n5. Hospital Admin Profiles:');
  const { data: adminProfiles, error: adminError } = await supabase
    .from('hospital_admin_profiles')
    .select('*, users(email, first_name, last_name)')
    .order('created_at', { ascending: false });
  
  if (adminError) {
    console.error('Error fetching admin profiles:', adminError);
  } else {
    console.log(`Found ${adminProfiles?.length || 0} admin profiles:`);
    adminProfiles?.forEach(p => {
      console.log(`  - ${p.users?.first_name} ${p.users?.last_name} (${p.users?.email})`);
      console.log(`    User ID: ${p.user_id}`);
      console.log(`    Facility ID: ${p.facility_id}`);
    });
  }

  console.log('\n=== Debug Complete ===');
}

debugStaff().catch((error) => {
  console.error('Error running debug script:', error);
  process.exit(1);
});
