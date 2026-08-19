import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth/getRequestUser';
import { resolvePostgresHospitalId, resolvePgUserId } from '@/lib/postgres/resolveId';
import { getSupabaseAdmin } from '@/lib/supabase/server';

function toClientShape(s: any) {
  return {
    _id: s.id,
    userId: s.user_id
      ? { _id: s.user_id, firstName: s.users?.first_name, lastName: s.users?.last_name, email: s.users?.email }
      : null,
    facilityId: s.facility_id,
    role: s.role,
    department: s.department,
    shiftSchedule: { start: s.shift_start, end: s.shift_end, days: s.shift_days || [] },
    isOnDuty: s.is_on_duty,
    hourlyRate: s.hourly_rate,
    qualifications: s.qualifications || [],
    createdAt: s.created_at,
  };
}

export async function GET(_req: NextRequest) {
  try {
    const user = await getRequestUser();
    if (!user || user.role !== 'hospital_admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const facilityId = await resolvePostgresHospitalId(user.userId, user.email);
    
    console.log('[GET /api/hospital/staff] Query details:', {
      adminMongoId: user.userId,
      adminEmail: user.email,
      resolvedFacilityId: facilityId,
    });

    if (!facilityId) {
      return NextResponse.json({
        success: false,
        error: 'No facility linked to this account. Please complete your facility profile first.',
      }, { status: 404 });
    }

    const { data: staffList, error } = await getSupabaseAdmin()
      .from('staff')
      .select('*, users(first_name, last_name, email)')
      .eq('facility_id', facilityId)
      .order('created_at', { ascending: false });
    
    if (error) throw new Error(error.message);

    console.log('[GET /api/hospital/staff] Staff query result:', {
      facilityId,
      staffCount: staffList?.length || 0,
      staffList: staffList?.map(s => ({
        id: s.id,
        userId: s.user_id,
        role: s.role,
        department: s.department,
        userEmail: s.users?.email,
      })),
    });

    return NextResponse.json({ success: true, data: (staffList || []).map(toClientShape) });
  } catch (error: any) {
    console.error('[GET /api/hospital/staff]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getRequestUser();
    if (!user || user.role !== 'hospital_admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const facilityId = await resolvePostgresHospitalId(user.userId, user.email);
    if (!facilityId) {
      return NextResponse.json({
        success: false,
        error: 'No facility linked to this account. Please complete your facility profile first.',
      }, { status: 404 });
    }

    const body = await req.json();
    const staffUserId = body.userId ? await resolvePgUserId(String(body.userId)) : null;

    const { data: newStaff, error } = await getSupabaseAdmin()
      .from('staff')
      .insert({
        user_id: staffUserId,
        facility_id: facilityId,
        role: body.role,
        department: body.department,
        shift_start: body.shiftSchedule?.start || null,
        shift_end: body.shiftSchedule?.end || null,
        shift_days: body.shiftSchedule?.days || [],
        is_on_duty: !!body.isOnDuty,
        hourly_rate: Number(body.hourlyRate) || 0,
        qualifications: body.qualifications || [],
      })
      .select('*, users(first_name, last_name, email)')
      .single();
    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true, data: toClientShape(newStaff) });
  } catch (error: any) {
    console.error('[POST /api/hospital/staff]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getRequestUser();
    if (!user || user.role !== 'hospital_admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const facilityId = await resolvePostgresHospitalId(user.userId, user.email);
    if (!facilityId) {
      return NextResponse.json({ success: false, error: 'No facility linked to this account' }, { status: 404 });
    }

    const body = await req.json();
    const { staffId, ...updates } = body;

    const pgUpdates: Record<string, unknown> = {};
    if (typeof updates.role === 'string') pgUpdates.role = updates.role;
    if (typeof updates.department === 'string') pgUpdates.department = updates.department;
    if (typeof updates.isOnDuty === 'boolean') pgUpdates.is_on_duty = updates.isOnDuty;
    if (typeof updates.hourlyRate === 'number') pgUpdates.hourly_rate = updates.hourlyRate;
    if (Array.isArray(updates.qualifications)) pgUpdates.qualifications = updates.qualifications;
    if (updates.shiftSchedule && typeof updates.shiftSchedule === 'object') {
      if (updates.shiftSchedule.start) pgUpdates.shift_start = updates.shiftSchedule.start;
      if (updates.shiftSchedule.end) pgUpdates.shift_end = updates.shiftSchedule.end;
      if (Array.isArray(updates.shiftSchedule.days)) pgUpdates.shift_days = updates.shiftSchedule.days;
    }

    const { data: updated, error } = await getSupabaseAdmin()
      .from('staff')
      .update(pgUpdates)
      .eq('id', staffId)
      .eq('facility_id', facilityId)
      .select('*, users(first_name, last_name, email)')
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Staff not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: toClientShape(updated) });
  } catch (error: any) {
    console.error('[PATCH /api/hospital/staff]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getRequestUser();
    if (!user || user.role !== 'hospital_admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const facilityId = await resolvePostgresHospitalId(user.userId, user.email);
    if (!facilityId) {
      return NextResponse.json({ success: false, error: 'No facility linked to this account' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const staffId = searchParams.get('id');
    if (!staffId) {
      return NextResponse.json({ success: false, error: 'staffId is required' }, { status: 400 });
    }

    const { data: deleted, error } = await getSupabaseAdmin()
      .from('staff')
      .delete()
      .eq('id', staffId)
      .eq('facility_id', facilityId)
      .select('id')
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Staff not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[DELETE /api/hospital/staff]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
