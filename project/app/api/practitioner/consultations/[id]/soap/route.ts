import { NextRequest, NextResponse } from 'next/server';
import Consultation from '@/lib/models/Consultation';
import { requireConsultationParticipant } from '@/lib/auth/access';
import { PublicError, apiError } from '@/lib/api/errors';

/**
 * SOAP notes for a consultation.
 *
 * Both verbs previously resolved no identity at all — not a session, not a
 * role, not ownership. Any signed-in account could read, and silently rewrite,
 * the clinical narrative of any consultation in the system, leaving no record
 * of who did it. A SOAP note is what the next clinician treats the patient on,
 * so unattributed third-party edits are a safety problem before they are a
 * privacy one.
 *
 * Writing is the practitioner's alone. Reading is open to both parties: the
 * patient is entitled to the record of their own consultation, and locking
 * them out of it would be a different kind of wrong.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // Resolves the caller, the consultation, and that the two belong together
    // — or throws. Also connects to the database.
    const { user, consultation } = await requireConsultationParticipant(id);

    if (String(consultation.practitionerId) !== user.userId) {
      throw new PublicError(
        'Only the practitioner on this consultation can write its notes',
        403,
      );
    }

    const body = await req.json();
    const { subjective, objective, assessment, plan } = body;

    const updated = await Consultation.findByIdAndUpdate(
      id,
      {
        $set: {
          soapNotes: {
            subjective: subjective || '',
            objective: objective || '',
            assessment: assessment || '',
            plan: plan || '',
            savedAt: new Date(),
          },
        },
      },
      { new: true },
    );

    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Consultation not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: { soapNotes: updated.soapNotes },
    });
  } catch (err: unknown) {
    return apiError(err, 'The notes could not be saved. Please try again.');
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // Either party may read; the guard has already loaded the consultation,
    // so there is nothing left to fetch.
    const { consultation } = await requireConsultationParticipant(id);

    return NextResponse.json({
      success: true,
      data: { soapNotes: consultation.soapNotes || {} },
    });
  } catch (err: unknown) {
    return apiError(err, 'The notes could not be loaded. Please try again.');
  }
}
