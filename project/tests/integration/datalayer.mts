/**
 * Data-layer integration tests. Run against a THROWAWAY Postgres exposed through PostgREST:
 *   SUPABASE_URL=http://localhost:3002 SUPABASE_SECRET_KEY=<service jwt> npx tsx tests/integration/datalayer.ts
 * Refuses to run against protected projects.
 */
import assert from "node:assert/strict";
import { isDuplicateKeyError, newId } from "@/lib/db";
import { User } from "@/lib/models/User";
import { Consultation } from "@/lib/models/Consultation";
import { Conversation } from "@/lib/models/Conversation";
import { Message } from "@/lib/models/Message";
import { Call } from "@/lib/models/Call";
import { Facility } from "@/lib/models/Facility";
import { MedicalContext, LabResult } from "@/lib/models/ClinicalData";
import { PatientProfile, PractitionerProfile } from "@/lib/models/RoleProfiles";
import { PractitionerSchedule } from "@/lib/models/Scheduling";
import { PaymentTransaction } from "@/lib/models/Billing";
import { Notification } from "@/lib/models/Communications";

if ((process.env.SUPABASE_URL ?? "").includes("cagmxeebwtjrbaemwdwj")) throw new Error("refusing to test against production");

let passed = 0, failed = 0;
async function t(name: string, fn: () => Promise<void>) {
  try { await fn(); passed++; console.log(`  ok   ${name}`); }
  catch (e: any) { failed++; console.log(`  FAIL ${name}\n       ${String(e?.stack ?? e).split("\n").slice(0, 6).join("\n       ")}`); }
}
const tag = `dl${Date.now()}`;
const mk = (n: string, extra: any = {}) => User.create({ email: `${tag}.${n}@t.example`, role: "patient", firstName: n, lastName: tag, ...extra });

const a = await mk("alice"), b = await mk("bob", { role: "practitioner" }), c = await mk("carol");

console.log("filters, projection, sort");
await t("$in / $nin / $ne / $exists / invalid ids ignored", async () => {
  assert.equal((await User.find({ _id: { $in: [a._id, b._id, "garbage"] } })).length, 2);
  assert.equal((await User.find({ _id: "garbage" })).length, 0);
  assert.equal((await User.find({ lastName: tag, _id: { $nin: [a._id] } })).length, 2);
  assert.equal((await User.find({ lastName: tag, mobile: { $exists: false } })).length, 3);
  assert.equal((await User.find({ lastName: tag, _id: { $ne: "garbage" } })).length, 3);
});
await t("$or + $and + $regex (case-insens) + escapeRegex-style patterns", async () => {
  const r = await User.find({ lastName: tag, $or: [{ firstName: /^AL/i }, { $and: [{ firstName: "bob" }, { role: "practitioner" }] }] }).sort({ firstName: 1 });
  assert.deepEqual(r.map((u: any) => u.firstName), ["alice", "bob"]);
  assert.equal((await User.find({ email: { $regex: `^${tag}\\.carol@`, $options: "i" } })).length, 1);
});
await t("select include/exclude and lean", async () => {
  const u: any = await User.findById(a._id, "firstName").lean();
  assert.equal(u.firstName, "alice"); assert.equal(u.email, undefined); assert.equal(String(u._id), String(a._id));
  const v: any = await User.findById(a._id).select("-passwordHash -email").lean();
  assert.equal(v.email, undefined); assert.equal(v.firstName, "alice");
});
await t("sort asc/desc with nulls like Mongo (nulls first asc)", async () => {
  await User.updateOne({ _id: a._id }, { $set: { mobile: "111" } });
  await User.updateOne({ _id: b._id }, { $set: { mobile: "222" } });
  const asc = (await User.find({ lastName: tag }).sort({ mobile: 1 })).map((u: any) => u.firstName);
  assert.equal(asc[0], "carol");
  const desc = (await User.find({ lastName: tag }).sort("-mobile")).map((u: any) => u.firstName);
  assert.equal(desc[desc.length - 1], "carol");
});
await t("countDocuments / exists / distinct", async () => {
  assert.equal(await User.countDocuments({ lastName: tag }), 3);
  assert.ok(await User.exists({ email: `${tag}.alice@t.example` }));
  assert.equal(await User.exists({ email: "nobody@t.example" }), null);
  assert.deepEqual((await User.find({ lastName: tag }).distinct("role")).sort(), ["patient", "practitioner"]);
});

console.log("documents");
await t("save() persists only changed fields; dates are Date", async () => {
  const doc: any = await User.findById(c._id);
  assert.ok(doc.createdAt instanceof Date);
  doc.firstName = "caroline"; doc.mfaEnabled = true; await doc.save();
  const again: any = await User.findById(c._id).lean();
  assert.equal(again.firstName, "caroline"); assert.equal(again.mfaEnabled, true);
});
await t("new Model().save() inserts", async () => {
  const d: any = new User({ email: `${tag}.dave@t.example`, role: "patient", firstName: "dave", lastName: tag });
  await d.save();
  assert.ok(d._id); assert.equal((await User.findById(d._id).lean() as any).firstName, "dave");
});
await t("unique violation -> code 11000 with keyPattern", async () => {
  try { await mk("alice"); assert.fail("should throw"); } catch (e: any) { assert.ok(isDuplicateKeyError(e)); assert.ok(e.keyPattern?.email); }
});
await t("invalid enum -> ValidationError", async () => {
  try { await User.create({ email: `${tag}.x@t.example`, role: "wizard", firstName: "x", lastName: "y" }); assert.fail("should throw"); }
  catch (e: any) { assert.equal(e.name, "ValidationError"); }
});

console.log("updates");
await t("$inc is atomic under concurrency", async () => {
  const conv: any = await Conversation.create({ patientId: a._id, practitionerId: b._id, minutesAllocated: 30 });
  await Promise.all(Array.from({ length: 20 }, () => Conversation.updateOne({ _id: conv._id }, { $inc: { minutesUsed: 1 } })));
  assert.equal((await Conversation.findById(conv._id).lean() as any).minutesUsed, 20);
});
await t("findOneAndUpdate claim: only one concurrent winner", async () => {
  const msgConv: any = await Conversation.create({ patientId: a._id, practitionerId: b._id, minutesAllocated: 30 });
  const m: any = await Message.create({ conversationId: msgConv._id, senderId: a._id, receiverId: b._id, content: "x", type: "text" });
  const claims = await Promise.all(Array.from({ length: 8 }, () =>
    Message.findOneAndUpdate({ _id: m._id, reminderEmailSentAt: { $exists: false } }, { $set: { reminderEmailSentAt: new Date() } }, { new: true }),
  ));
  assert.equal(claims.filter(Boolean).length, 1, "exactly one claimer should win");
});
await t("upsert: concurrent upserts converge on one row", async () => {
  const email = `${tag}.up@t.example`;
  await Promise.all(Array.from({ length: 6 }, () => User.updateOne({ email }, { $set: { firstName: "up", lastName: tag, role: "patient" } }, { upsert: true })));
  assert.equal(await User.countDocuments({ email }), 1);
});
await t("updateMany with $set returns counts; $unset nulls", async () => {
  const r: any = await User.updateMany({ lastName: tag, role: "patient" }, { $set: { phoneE164: null } });
  assert.ok(r.matchedCount >= 2);
  await User.updateOne({ _id: a._id }, { $unset: { mobile: 1 } });
  assert.equal((await User.findById(a._id).lean() as any).mobile, undefined);
});
await t("updateMany with $or filter (PostgREST RETURNING projection regression)", async () => {
  const r: any = await User.updateMany({ lastName: tag, $or: [{ firstName: "alice" }, { firstName: "bob" }] }, { $set: { mfaEnabled: true } });
  assert.equal(r.modifiedCount, 2);
});
await t("deleteOne / deleteMany / findOneAndDelete", async () => {
  const z: any = await mk("zed");
  assert.equal((await User.deleteOne({ _id: z._id }) as any).deletedCount, 1);
  const y: any = await mk("yan");
  assert.ok(await User.findOneAndDelete({ _id: y._id }));
  assert.equal(await User.findById(y._id), null);
});

console.log("nested mapping, populate, children, lists");
await t("nested objects flatten to columns and back (soapNotes/clinicalRisk/pendingReschedule)", async () => {
  const cons: any = await Consultation.create({
    patientId: a._id, practitionerId: b._id, type: "video",
    scheduledStartTime: new Date(Date.now() + 1e8), scheduledEndTime: new Date(Date.now() + 1e8 + 36e5),
    soapNotes: { subjective: "S" }, clinicalRisk: { score: 7, color: "red", factors: ["a", "b"] },
    pendingReschedule: { proposedStart: new Date(Date.now() + 2e8), proposedBy: a._id },
  });
  await Consultation.updateOne({ _id: cons._id }, { $set: { "soapNotes.plan": "P" } });
  const got: any = await Consultation.findById(cons._id).populate("patientId", "firstName").lean();
  assert.equal(got.soapNotes.subjective, "S"); assert.equal(got.soapNotes.plan, "P");
  assert.deepEqual(got.clinicalRisk.factors, ["a", "b"]); assert.equal(got.clinicalRisk.score, 7);
  assert.equal(got.patientId.firstName, "alice");
  assert.ok(got.pendingReschedule.proposedStart instanceof Date);
  assert.equal(await Consultation.countDocuments({ "clinicalRisk.score": { $exists: true, $ne: null }, patientId: a._id }), 1);
});
await t("children arrays (allergies) via create / $push / $pull / save", async () => {
  const mc: any = await MedicalContext.create({ patientId: a._id, bloodType: "A+", allergies: [{ allergen: "Pollen", severity: "mild", reaction: "sneeze", source: "patient" }] });
  await MedicalContext.updateOne({ _id: mc._id }, { $push: { allergies: { allergen: "Nuts", severity: "severe", reaction: "", source: "patient" } } });
  let got: any = await MedicalContext.findOne({ patientId: a._id }).lean();
  assert.deepEqual(got.allergies.map((x: any) => x.allergen).sort(), ["Nuts", "Pollen"]);
  await MedicalContext.updateOne({ _id: mc._id }, { $pull: { allergies: { allergen: "Pollen" } } });
  got = await MedicalContext.findOne({ patientId: a._id }).lean();
  assert.deepEqual(got.allergies.map((x: any) => x.allergen), ["Nuts"]);
  const up: any = await MedicalContext.findOneAndUpdate({ patientId: c._id }, { $push: { allergies: { allergen: "Dust", severity: "mild", reaction: "", source: "patient" } } }, { upsert: true, new: true });
  assert.equal(up.allergies.length, 1);
  const lab: any = await LabResult.create({ patientId: a._id, testName: "FBC", dateReported: new Date(), parameters: [{ name: "Hb", value: "13", unit: "g/dL", referenceRange: "12-16", status: "normal" }] });
  assert.equal((await LabResult.findById(lab._id).lean() as any).parameters[0].referenceRange, "12-16");
});
await t("id lists via join tables ($addToSet/$pull, filter by list membership)", async () => {
  const pp: any = await PatientProfile.create({ userId: a._id, dateOfBirth: new Date("1990-01-01"), gender: "female" });
  await PatientProfile.updateOne({ userId: a._id }, { $addToSet: { favoritePractitionerIds: b._id } });
  await PatientProfile.updateOne({ userId: a._id }, { $addToSet: { favoritePractitionerIds: b._id, myDoctorIds: b._id } } as any);
  const got: any = await PatientProfile.findOne({ userId: a._id }).lean();
  assert.deepEqual(got.favoritePractitionerIds.map(String), [String(b._id)]);
  assert.deepEqual(got.myDoctorIds.map(String), [String(b._id)]);
  assert.equal((await PatientProfile.find({ favoritePractitionerIds: b._id }).lean()).length, 1);
  assert.equal((await PatientProfile.find({ favoritePractitionerIds: c._id }).lean()).length, 0);
  await PatientProfile.updateOne({ userId: a._id }, { $pull: { favoritePractitionerIds: b._id } });
  assert.equal(((await PatientProfile.findOne({ userId: a._id }).lean()) as any).favoritePractitionerIds.length, 0);
  await PractitionerProfile.create({ userId: b._id, specialisation: "GP", hpcsaNumber: `H${tag}`, affiliatedFacilityIds: [] });
  const fac: any = await Facility.create({ name: `F ${tag}`, facilityType: "Private", address: { city: "Cape Town", coordinates: [18.4, -33.9] } });
  await PractitionerProfile.updateOne({ userId: b._id }, { $addToSet: { affiliatedFacilityIds: fac._id } });
  const pr: any = await PractitionerProfile.findOne({ userId: b._id }).populate({ path: "affiliatedFacilityIds", select: "name" }).lean();
  assert.equal(pr.affiliatedFacilityIds[0].name, `F ${tag}`);
  const f2: any = await Facility.findById(fac._id).lean();
  assert.deepEqual(f2.address.coordinates, [18.4, -33.9]);
});
await t("schedule slots children + date column", async () => {
  const s: any = await PractitionerSchedule.create({ practitionerId: b._id, date: new Date("2030-01-01"), slots: [{ startTime: "09:00", endTime: "09:30", status: "available" }] });
  const got: any = await PractitionerSchedule.findById(s._id).lean();
  assert.equal(got.slots.length, 1); assert.ok(got.date instanceof Date);
});
await t("JSON sub-path filter (notifications.data.x) and json roundtrip", async () => {
  await Notification.create({ userId: a._id, type: "t", title: "x", body: "y", data: { consultationId: "c-1", n: 2 } });
  assert.equal((await Notification.find({ userId: a._id, "data.consultationId": "c-1" }).lean()).length, 1);
  assert.equal(((await Notification.findOne({ userId: a._id }).lean()) as any).data.n, 2);
});

console.log("unique/partial indexes + big lists + aggregate");
await t("active call per conversation/consultation enforced (11000)", async () => {
  const conv: any = await Conversation.create({ patientId: a._id, practitionerId: b._id, minutesAllocated: 30 });
  await Call.create({ conversationId: conv._id, initiatedBy: a._id, type: "video", status: "active" });
  try { await Call.create({ conversationId: conv._id, initiatedBy: b._id, type: "video", status: "active" }); assert.fail("expected dup"); }
  catch (e: any) { assert.ok(isDuplicateKeyError(e)); }
  await Call.create({ conversationId: conv._id, initiatedBy: b._id, type: "video", status: "ended" }); // ended ones are fine
});
await t("find with >150 ids in $in and >1000 rows paginate", async () => {
  const ids = [a._id, b._id, c._id, ...Array.from({ length: 400 }, () => newId())];
  assert.equal((await User.find({ _id: { $in: ids } })).length, 3);
  assert.equal(await User.countDocuments({ _id: { $in: ids } }), 3);
  const conv: any = await Conversation.create({ patientId: a._id, practitionerId: b._id, minutesAllocated: 30 });
  const rows = Array.from({ length: 1100 }, (_, i) => ({ conversationId: conv._id, senderId: a._id, receiverId: b._id, content: `m${i}`, type: "text" }));
  await Message.create(rows as any);
  const all = await Message.find({ conversationId: conv._id }).sort({ createdAt: 1 }).lean();
  assert.equal(all.length, 1100); assert.equal(new Set(all.map((m: any) => String(m._id))).size, 1100);
  const lim = await Message.find({ conversationId: conv._id }).sort({ createdAt: -1 }).limit(5).lean();
  assert.equal(lim.length, 5);
});
await t("aggregate: $match/$sort/$group first/sum/avg + $month", async () => {
  await PaymentTransaction.create([
    { patientId: a._id, practitionerId: b._id, amount: 100, provider: "card", status: "completed", category: "service_booking", platformFeeAmount: 15 },
    { patientId: a._id, practitionerId: b._id, amount: 50, provider: "card", status: "completed", category: "service_booking" },
  ] as any);
  const g = await PaymentTransaction.aggregate([
    { $match: { practitionerId: b._id, status: "completed" } },
    { $group: { _id: null, gmv: { $sum: "$amount" }, fees: { $sum: { $ifNull: ["$platformFeeAmount", 0] } }, n: { $sum: 1 }, avg: { $avg: "$amount" } } },
  ]);
  assert.equal(g[0].gmv, 150); assert.equal(g[0].fees, 15); assert.equal(g[0].n, 2); assert.equal(g[0].avg, 75);
  const byMonth = await PaymentTransaction.aggregate([{ $match: { practitionerId: b._id } }, { $group: { _id: { $month: "$timestamp" }, c: { $sum: 1 } } }]);
  assert.equal(byMonth[0].c, 2);
});

// cleanup
await Facility.deleteMany({ name: `F ${tag}` });
await Promise.all([a, b, c].map((u: any) => User.deleteOne({ _id: u._id })));
await User.deleteMany({ lastName: tag });
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
