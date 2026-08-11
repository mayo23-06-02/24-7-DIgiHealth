import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth/getRequestUser';
import { resolvePostgresHospitalId } from '@/lib/postgres/resolveId';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import {
  durableUrl,
  isSupabaseConfigured,
  MediaValidationError,
  uploadBuffer,
} from '@/lib/supabase/media';
import { inferMimeFromFileName } from '@/lib/supabase/media-validation';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const user = await getRequestUser();
    if (!user || user.role !== 'hospital_admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const hospitalId = await resolvePostgresHospitalId(user.userId, user.email);
    if (!hospitalId) {
      return NextResponse.json({ success: false, error: 'No facility linked to this account.' }, { status: 404 });
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ success: false, error: 'Media storage is not configured' }, { status: 503 });
    }

    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = file.name || 'facility-logo';
    const mimeType = file.type || inferMimeFromFileName(fileName) || 'application/octet-stream';

    const asset = await uploadBuffer({
      buffer,
      fileName,
      mimeType,
      userId: user.userId,
      purpose: 'facility',
      relatedType: 'facility_logo',
      relatedId: hospitalId,
      facilityId: hospitalId,
      isPublic: true,
    });

    const url = durableUrl(asset);
    await getSupabaseAdmin().from('facilities').update({ logo: url }).eq('id', hospitalId);

    return NextResponse.json({ success: true, data: { url } });
  } catch (err: any) {
    const status = err instanceof MediaValidationError ? 400 : 500;
    console.error('[POST /api/hospital/facility/logo]', err);
    const msg =
      err?.message?.includes('not configured') || err?.message?.includes('Supabase')
        ? 'Media storage is not configured. Contact support or check SUPABASE media env vars.'
        : err.message || 'Upload failed';
    return NextResponse.json({ success: false, error: msg }, { status });
  }
}
