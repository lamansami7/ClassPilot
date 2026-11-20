// Disposable PostgreSQL instance. No network, project credentials or production rows.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
const db = new PGlite();
try {
  await db.exec(`create role anon; create role authenticated; create role service_role; create schema auth; grant usage on schema auth to authenticated,anon;
 create table auth.users(id uuid primary key default gen_random_uuid(), email text, email_confirmed_at timestamptz,raw_user_meta_data jsonb);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid$$;`);
  for (const file of ["0000_classpilot_core_schema.sql", "0001_seed_wdmcs_catalog_and_admin.sql"])
    await db.exec(
      await readFile(new URL("../drizzle/migrations/" + file, import.meta.url), "utf8"),
    );
  await db.exec(
    `update public.app_settings set allowed_email_domains='{example.test}',admin_emails='{admin@example.test}',require_admin_approval=true`,
  );
  const evidence = JSON.parse(
    await readFile(new URL("../src/lib/catalog-evidence.json", import.meta.url), "utf8"),
  );
  const catalog = (
    await db.query("select course_name, grades, school from courses where not is_custom")
  ).rows;
  for (const [department, entries] of Object.entries(evidence))
    for (const [name, grades] of Object.entries(entries)) {
      const matches = catalog.filter(
        (c) =>
          c.course_name === (name === "Cafè V" ? "Café V" : name) &&
          c.school === (department === "junior-high" ? "Junior High" : "High School"),
      );
      assert.equal(matches.length, 1, `seed mapping for ${name}`);
      if (name !== "Carpentry II") assert.equal(matches[0].grades.join(","), grades, name);
    }
  await db.exec(
    `create schema storage;grant usage on schema storage to authenticated;create table storage.objects(name text,bucket_id text);grant select,insert,update,delete on storage.objects to authenticated;alter table storage.objects enable row level security;create function storage.foldername(name text) returns text[] language sql immutable as $$select (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1]$$`,
  );
  await db.exec(
    await readFile(
      new URL("../drizzle/migrations/0002_storage_policies.sql", import.meta.url),
      "utf8",
    ),
  );
  const school = (await db.query("select id from schools where name='Stilwell Junior High School'"))
    .rows[0].id;
  async function user(email, grade) {
    return (
      await db.query(
        "insert into auth.users(email,email_confirmed_at,raw_user_meta_data) values ($1,now(),$2) returning id",
        [email, JSON.stringify({ grade, school_id: school })],
      )
    ).rows[0].id;
  }
  await assert.rejects(() => user("invalid@example.test", 11), /ELIGIBILITY/);
  const student = await user("student@example.test", 8),
    admin = await user("admin@example.test", 8);
  async function asUser(id) {
    await db.exec("reset role;set role authenticated");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  }
  await asUser(student);
  assert.equal(
    (await db.query("select eligibility_status from profiles")).rows[0].eligibility_status,
    "pending",
  );
  await assert.rejects(
    () => db.query("insert into notes(title) values ('synthetic')"),
    /row-level security/,
  );
  await assert.rejects(() => db.query("select admin_platform_stats()"), /Forbidden/);
  await asUser(admin);
  await db.query("update profiles set eligibility_status='approved' where id=$1", [student]);
  await asUser(student);
  await db.query("insert into notes(title) values ('synthetic')");
  assert.equal((await db.query("select title from notes")).rows.length, 1);
  await db.query("insert into storage.objects values ($1,'recordings')", [
    student + "/synthetic.webm",
  ]);
  assert.equal((await db.query("select * from storage.objects")).rows.length, 1);
  await asUser(admin);
  assert.equal((await db.query("select title from notes")).rows.length, 0);
  assert.equal((await db.query("select * from storage.objects")).rows.length, 0);
  await db.query("update profiles set eligibility_status='rejected' where id=$1", [student]);
  await asUser(student);
  assert.equal((await db.query("select title from notes")).rows.length, 0);
  console.log(
    "PASS: grade/school validation, pending access, admin-only stats, approval, private notes, revocation",
  );
} finally {
  await db.close();
}
