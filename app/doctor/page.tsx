import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, LogOut, UserRound } from "lucide-react";
import { auth, signOut } from "@/auth";
import { getAppointments, getAvailability } from "@/lib/db";
import { getDoctorPhotoUrl } from "@/lib/doctor-photo";
import { DoctorDashboard } from "../ui/doctor-dashboard";
import { HomeoLifeLogo } from "../ui/logo";

export default async function DoctorPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const [appointments, availability, photoUrl] = await Promise.all([
    getAppointments(),
    getAvailability(),
    getDoctorPhotoUrl()
  ]);

  return (
    <main className="doctorPage">
      <div className="doctorTopbar">
        <Link className="brand" href="/"><HomeoLifeLogo /></Link>
        <Link className="textLink" href="/"><ArrowLeft size={17} /> Back to site</Link>
        <div className="doctorSession">
          <span><UserRound size={17} /> {session.user.name ?? session.user.email}</span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button className="button compact" type="submit">
              <LogOut size={16} /> Sign out
            </button>
          </form>
        </div>
      </div>
      <section className="section doctorDashboardPage">
        <div className="sectionHeading">
          <p className="eyebrow">Doctor workspace</p>
          <h1>Manage calendar, content, FAQs, and patient appointments.</h1>
          <p>
            Availability is now live and saved to Postgres. Appointments, content, and FAQ tabs are
            still UI-only and not yet wired to the database.
          </p>
        </div>
        <DoctorDashboard appointments={appointments} availability={availability} photoUrl={photoUrl} />
      </section>
    </main>
  );
}
