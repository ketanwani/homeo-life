import Link from "next/link";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { getAppointments } from "@/lib/db";
import { DoctorDashboard } from "../ui/doctor-dashboard";
import { HomeoLifeLogo } from "../ui/logo";

export default async function DoctorPage() {
  const appointments = await getAppointments();

  return (
    <main className="doctorPage">
      <div className="doctorTopbar">
        <Link className="brand" href="/"><HomeoLifeLogo /></Link>
        <Link className="textLink" href="/"><ArrowLeft size={17} /> Back to site</Link>
        <div><LockKeyhole size={17} /> Auth placeholder</div>
      </div>
      <section className="section doctorDashboardPage">
        <div className="sectionHeading">
          <p className="eyebrow">Doctor workspace</p>
          <h1>Manage calendar, content, FAQs, and patient appointments.</h1>
          <p>
            This is the logged-in product surface. Add NextAuth or Clerk, then connect the forms to
            PostgreSQL mutations and the private scheduling provider.
          </p>
        </div>
        <DoctorDashboard appointments={appointments} />
      </section>
    </main>
  );
}
