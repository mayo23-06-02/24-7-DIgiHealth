import { Session, db, step, expect, expectStatus, done } from "./lib.mjs";
const stamp = Date.now();
const mega = await Session.as("mega@247digihealth.com");
const [adm] = await db("GET", "hospital_admin_profiles", "select=facility_id&limit=1");
const hp = `MP${String(stamp).slice(-7)}`;
const email = `docwiz.${stamp}@example.com`;
await step("doctor completes wizard via staff-number claim", async () => {
  expectStatus(await mega.call("POST", `/api/admin/facilities/${adm.facility_id}/doctors`, {
    staff_number: `DW-${stamp}`, first_name: "Anele", last_name: "Zulu", email, mobile: `072${String(stamp).slice(-7)}`, hpcsa_number: hp, specialisation: "Cardiologist",
  }), 200, 201);
  const form = {
    fileClaim: { facilityId: adm.facility_id, fileNumber: `DW-${stamp}`, hpcsaNumber: hp, kind: "doctor" },
    hpcsaNumber: hp, practiceNumber: "1234567", experience: "15", specialization: "Cardiologist",
    fullName: "Anele Zulu", saId: "", countryCode: "+27", mobile: "", email, street: "1 Main Rd", city: "Johannesburg", province: "Gauteng", languages: ["English"],
    bgCheckConsent: true, practitionerConsent: true, practitionerTermsAccepted: true, profilePhoto: "/api/media/file/00000000-0000-0000-0000-000000000000",
    bankHolder: "Anele Zulu", bankName: "FNB", bankAccount: "62000000000", password: "Password123!", confirmPassword: "Password123!",
  };
  const anon = new Session(null);
  // Another account already has this mobile number.
  const [other] = await db("GET", "users", "phone_e164=not.is.null&select=phone_e164&limit=1");
  const taken = await anon.call("POST", "/api/auth/register", { role: "practitioner", formData: { ...form, mobile: other.phone_e164.replace("+27", "") } });
  expectStatus(taken, 409);
  expect(taken.json.code === "MOBILE_TAKEN", "clear duplicate-mobile message");
  const r = await anon.call("POST", "/api/auth/register", { role: "practitioner", formData: { ...form, mobile: `83${String(stamp).slice(-7)}` } });
  expectStatus(r, 200);
  const [u] = await db("GET", "users", `email=eq.${encodeURIComponent(email)}&select=password_hash,phone_e164`);
  expect(u.password_hash && u.phone_e164 === `+2783${String(stamp).slice(-7)}`, "doctor completed");
  const [pp] = await db("GET", "practitioner_profiles", `user_id=eq.${(await db("GET","users",`email=eq.${encodeURIComponent(email)}&select=id`))[0].id}&select=*`);
  expect(pp.bank_account_number === "62000000000" || pp.bank_account_number == null, "profile updated without error");
});
done();
