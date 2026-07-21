import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const valueOrFallback = (
  value: string | number | null | undefined,
  fallback = "Not provided",
) => (value === null || value === undefined || value === "" ? fallback : value);

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profileFields =
    "student_id, name, role, email, phone, status, date_of_birth";
  const { data: linkedProfile } = user
    ? await supabase
        .from("part_timer")
        .select(profileFields)
        .eq("auth_user_id", user.id)
        .maybeSingle()
    : { data: null };

  let profile = linkedProfile;
  if (!profile && user?.email) {
    const { data: emailProfile } = await supabase
      .from("part_timer")
      .select(profileFields)
      .ilike("email", user.email)
      .maybeSingle();
    profile = emailProfile;
  }

  const metadataName =
    typeof user?.user_metadata?.name === "string"
      ? user.user_metadata.name.trim()
      : "";
  const name: string =
    profile?.name ||
    metadataName ||
    "AV team member";
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "AV";

  const details = [
    { label: "Student ID", value: profile?.student_id },
    { label: "Role", value: profile?.role, humanize: true },
    { label: "Account status", value: profile?.status, humanize: true },
    { label: "Email", value: profile?.email ?? user?.email },
    { label: "Phone", value: profile?.phone },
    { label: "Date of birth", value: profile?.date_of_birth },
  ] as const;

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-4xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
          Account
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          Profile &amp; settings
        </h1>
        <p className="mt-2 text-slate-600">
          Review your identity, access role, and account security.
        </p>

        <section className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 p-6 sm:flex-row sm:items-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-500 text-lg font-black text-slate-950">
              {initials}
            </span>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{name}</h2>
              <p className="mt-1 text-sm capitalize text-slate-500">
                {valueOrFallback(profile?.role, "AV team member")
                  .toString()
                  .replaceAll("_", " ")}
              </p>
            </div>
          </div>
          <dl className="grid sm:grid-cols-2">
            {details.map(({ label, value, ...detail }) => (
              <div
                key={label}
                className="border-b border-slate-100 px-6 py-4 sm:odd:border-r"
              >
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {label}
                </dt>
                <dd
                  className={`mt-1 text-sm font-medium text-slate-900 ${
                    "humanize" in detail && detail.humanize ? "capitalize" : ""
                  }`}
                >
                  {"humanize" in detail && detail.humanize
                    ? valueOrFallback(value).toString().replaceAll("_", " ")
                    : valueOrFallback(value).toString()}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {!profile && (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Your login works, but no accessible part-timer profile is linked to
            this account. Match <code>part_timer.auth_user_id</code> to your
            Supabase Authentication user ID and check the profile RLS policy.
          </p>
        )}

        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-bold text-slate-900">Security</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Your password and authenticated session are managed securely by
            Supabase Authentication. Contact the admin or quartermaster to
            update profile information.
          </p>
          <form action="/auth/signout" method="post" className="mt-5">
            <button
              type="submit"
              className="rounded-lg border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50"
            >
              Sign out of this account
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
