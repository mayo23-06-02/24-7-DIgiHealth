import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth/getRequestUser';
import { resolvePostgresHospitalId } from '@/lib/postgres/resolveId';
import { getSupabaseAdmin } from '@/lib/supabase/server';

function toClientShape(f: any) {
  return {
    _id: f.id,
    name: f.name,
    facilityType: f.facility_type,
    address: {
      street: f.address_street,
      city: f.address_city,
      province: f.address_province,
      coordinates: [f.location_lng, f.location_lat],
    },
    contactInfo: {
      phone: f.contact_phone,
      emergencyPhone: f.contact_emergency_phone,
      email: f.contact_email,
    },
    bedCapacity: {
      total: f.bed_total,
      generalAvailable: f.bed_general_available,
      icuAvailable: f.bed_icu_available,
    },
    currentWaitTimeMins: f.current_wait_time_mins,
    isOpen: f.is_open,
    specialties: f.specialties || [],
    emergencyServices: f.emergency_services,
    logo: f.logo,
    wallpaper: f.wallpaper,
    regCertificate: f.reg_certificate,
  };
}

export async function GET(_req: NextRequest) {
  try {
    const user = await getRequestUser();
    if (!user || user.role !== 'hospital_admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const facilityId = await resolvePostgresHospitalId(user.userId, user.email);
    if (!facilityId) {
      return NextResponse.json({ success: false, error: 'No facility linked to this account.' }, { status: 404 });
    }

    const { data: facility, error } = await getSupabaseAdmin()
      .from('facilities')
      .select('*')
      .eq('id', facilityId)
      .maybeSingle();
    if (error || !facility) {
      return NextResponse.json({ success: false, error: 'Facility not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: toClientShape(facility) });
  } catch (error: any) {
    console.error('[GET /api/hospital/facility]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getRequestUser();
    if (!user || user.role !== 'hospital_admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const facilityId = await resolvePostgresHospitalId(user.userId, user.email);
    if (!facilityId) {
      return NextResponse.json({ success: false, error: 'No facility linked to this account.' }, { status: 404 });
    }

    const body = await req.json();
    const updates: Record<string, unknown> = {};
    if (typeof body.name === 'string') updates.name = body.name;
    if (['Public', 'Private', 'NGO'].includes(body.facilityType)) {
      updates.facility_type = body.facilityType;
    }
    if (body.address && typeof body.address === 'object') {
      if (body.address.street !== undefined) updates.address_street = body.address.street;
      if (body.address.city !== undefined) updates.address_city = body.address.city;
      if (body.address.province !== undefined) updates.address_province = body.address.province;
    }
    if (body.contactInfo && typeof body.contactInfo === 'object') {
      if (body.contactInfo.phone !== undefined) updates.contact_phone = body.contactInfo.phone;
      if (body.contactInfo.emergencyPhone !== undefined) updates.contact_emergency_phone = body.contactInfo.emergencyPhone;
      if (body.contactInfo.email !== undefined) updates.contact_email = body.contactInfo.email;
    }
    if (body.bedCapacity && typeof body.bedCapacity === 'object') {
      updates.bed_total = Number(body.bedCapacity.total) || 0;
      updates.bed_general_available = Number(body.bedCapacity.generalAvailable) || 0;
      updates.bed_icu_available = Number(body.bedCapacity.icuAvailable) || 0;
    }
    if (typeof body.isOpen === 'boolean') updates.is_open = body.isOpen;
    if (typeof body.emergencyServices === 'boolean') {
      updates.emergency_services = body.emergencyServices;
    }
    if (Array.isArray(body.specialties)) {
      updates.specialties = body.specialties.filter((s: unknown) => typeof s === 'string');
    }

    const { data: updatedFacility, error } = await getSupabaseAdmin()
      .from('facilities')
      .update(updates)
      .eq('id', facilityId)
      .select('*')
      .maybeSingle();
    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true, data: updatedFacility ? toClientShape(updatedFacility) : null });
  } catch (error: any) {
    console.error('[PUT /api/hospital/facility]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
