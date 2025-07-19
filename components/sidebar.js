import Link from 'next/link';
import Image from 'next/image';
import { Home, Users, ClipboardList, HelpCircle, User, Megaphone, PieChart, Beaker } from 'lucide-react';

export default function Sidebar() {
  return (
    <aside className="w-64 h-screen bg-blue-900 text-white px-6 py-4 fixed top-0 left-0">
      <div className="flex flex-col items-start">
        <div className="mb-8 flex flex-col items-start">
          <Image
            src="/matrix-logo.png"
            alt="Matrix Sampling Logo"
            width={200}
            height={75}
            priority
          />
        </div>
        <nav className="mt-4 space-y-3 w-full">
          <Link href="/dashboard" className="sidebar-link">
            <Home className="inline-block w-4 h-4 mr-2" /> Dashboard
          </Link>
          <Link href="/dashboard/clients" className="sidebar-link">
            <Users className="inline-block w-4 h-4 mr-2" /> Manage Clients
          </Link>
          <Link href="/dashboard/surveys" className="sidebar-link">
            <ClipboardList className="inline-block w-4 h-4 mr-2" /> Manage Surveys
          </Link>
          <Link href="/dashboard/generateadcode" className="sidebar-link">
            <Megaphone className="inline-block w-4 h-4 mr-2" /> Generate Ad Code
          </Link>
          {/* --- New Link Added --- */}
          <Link href="/dashboard/simulated-sample" className="sidebar-link">
            <Beaker className="inline-block w-4 h-4 mr-2" /> Simulated Sample
          </Link>
          <Link href="/dashboard/reports" className="sidebar-link">
            <PieChart className="inline-block w-4 h-4 mr-2" /> Reporting
          </Link>
        </nav>
      </div>
    </aside>
  );
}
