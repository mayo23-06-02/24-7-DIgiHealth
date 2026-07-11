import React from "react";
import PatientStep1 from "./Steps/Patient/PatientStep1";
import PatientStep2 from "./Steps/Patient/PatientStep2";
import PatientStep3 from "./Steps/Patient/PatientStep3";
import PatientStep4 from "./Steps/Patient/PatientStep4";
import PatientStep5 from "./Steps/Patient/PatientStep5";

import PractitionerStep1 from "./Steps/Practitioner/PractitionerStep1";
import PractitionerStep2 from "./Steps/Practitioner/PractitionerStep2";
import PractitionerStep3 from "./Steps/Practitioner/PractitionerStep3";
import PractitionerStep4 from "./Steps/Practitioner/PractitionerStep4";

import HospitalStep1 from "./Steps/Hospital/HospitalStep1";
import HospitalStep2 from "./Steps/Hospital/HospitalStep2";
import HospitalStep3 from "./Steps/Hospital/HospitalStep3";
import HospitalStep4 from "./Steps/Hospital/HospitalStep4";

import EmailOtpStep from "./Shared/EmailOtpStep";
import PreviewStep from "./PreviewStep";

type StepComponent = React.ComponentType<any>;

export const stepComponents: Record<string, StepComponent[]> = {
  patient: [
    PatientStep1,
    PatientStep2,
    PatientStep3,
    EmailOtpStep, // was PatientStep4 password
    PatientStep5,
    PreviewStep,
  ],
  practitioner: [
    PractitionerStep1,
    PractitionerStep2,
    PractitionerStep3,
    PractitionerStep4,
    EmailOtpStep, // was password
    PreviewStep,
  ],
  hospital: [
    HospitalStep1,
    HospitalStep2,
    HospitalStep3,
    HospitalStep4,
    EmailOtpStep, // was password
    PreviewStep,
  ],
};