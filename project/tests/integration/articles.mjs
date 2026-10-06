import { Session, db, step, expect, expectStatus, done } from "./lib.mjs";

const stamp = Date.now();
const sup = await Session.as("super@247digihealth.com");
const patient = await Session.as("john.dlamini@example.com");
let id;
const base = { title: `Sleep better ${stamp}`, excerpt: "Five habits.", author: "Dr Test", coverImage: "https://images.example.com/c.jpg",
  content: "Intro **bold** <script>alert(1)</script>\n\n## Tips\n- Water\n- Rest", tags: ["Wellness"] };

console.log("news & articles");
await step("patient cannot manage articles", async () => {
  expectStatus(await patient.call("GET", "/api/admin/articles"), 401, 403);
  expectStatus(await patient.call("POST", "/api/admin/articles", base), 401, 403);
});
await step("validation", async () => {
  expectStatus(await sup.call("POST", "/api/admin/articles", { title: "x" }), 400);
  expectStatus(await sup.call("POST", "/api/admin/articles", { ...base, coverImage: "javascript:alert(1)" }), 400);
});
await step("super admin creates a draft; content is escaped HTML", async () => {
  const r = expectStatus(await sup.call("POST", "/api/admin/articles", { ...base, isPublished: false }), 201);
  id = r.json.data.id;
  const [a] = await db("GET", "articles", `id=eq.${id}&select=*`);
  expect(a.slug === `sleep-better-${stamp}` && a.is_published === false, "slug + draft");
  expect(a.content.includes("<strong>bold</strong>") && a.content.includes("&lt;script&gt;") && !a.content.includes("<script>"), `escaped: ${a.content}`);
  expect(a.content.includes("<h3>Tips</h3>") && a.content.includes("<li>Water</li>"), "headings and bullets");
});
await step("drafts are hidden from patients", async () => {
  const r = expectStatus(await patient.call("GET", "/api/articles?limit=50"), 200);
  expect(!r.json.data.some((a) => String(a.id ?? a._id) === id), "draft not listed");
});
await step("edit loads as text, publish makes it visible", async () => {
  const g = expectStatus(await sup.call("GET", `/api/admin/articles/${id}`), 200);
  expect(g.json.data.contentText.includes("## Tips") && g.json.data.contentText.includes("- Water"), "editable text");
  expectStatus(await sup.call("PATCH", `/api/admin/articles/${id}`, { isPublished: true, title: `Sleep better now ${stamp}` }), 200);
  const r = expectStatus(await patient.call("GET", "/api/articles?limit=50"), 200);
  expect(r.json.data.some((a) => String(a.id ?? a._id) === id && a.title.startsWith("Sleep better now")), "published + updated");
});
await step("duplicate slug -> 409", async () => {
  expectStatus(await sup.call("POST", "/api/admin/articles", { ...base, slug: `sleep-better-${stamp}` }), 409);
});
await step("delete", async () => {
  expectStatus(await sup.call("DELETE", `/api/admin/articles/${id}`), 200);
  expect((await db("GET", "articles", `id=eq.${id}&select=id`)).length === 0, "gone");
});
done();
