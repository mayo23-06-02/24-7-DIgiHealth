import React from "react";
import {
  PatientStep1,
  PatientAnthropometricStep,
  PatientPaymentStep,
  PatientEmergencyStep,
  POPIAConsentStep,
  PatientDocumentStep,
  PasswordCreationStep,
} from "./steps/PatientWizardSteps";
import {
  PractitionerStep1,
  PractitionerStep2,
  PractitionerStep3,
  PractitionerStep4,
} from "./steps/PractitionerWizardSteps";
import {
  HospitalStep1,
  HospitalStep2,
  HospitalStep3,
  HospitalStep4,
} from "./steps/HospitalWizardSteps";
import PreviewStep from "./PreviewStep";

type StepComponent = React.ComponentType<any>;

export const stepComponents: Record<string, StepComponent[]> = {
  patient: [
    PatientStep1,
    POPIAConsentStep,
    PatientAnthropometricStep,
    PatientPaymentStep,
    PatientEmergencyStep,
    PatientDocumentStep,
    PasswordCreationStep,
    PreviewStep,
  ],
  practitioner: [
    PractitionerStep1,
    PractitionerStep2,
    PractitionerStep3,
    PractitionerStep4,
    PasswordCreationStep,
    PreviewStep,
  ],
  hospital: [
    HospitalStep1,
    HospitalStep2,
    HospitalStep3,
    HospitalStep4,
    PasswordCreationStep,
    PreviewStep,
  ],
};