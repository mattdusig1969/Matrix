import Link from 'next/link';
import Image from 'next/image';
import { Home, Users, ClipboardList, HelpCircle, User, Megaphone, PieChart } from 'lucide-react';

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
          <Link href="/dashboard/questions" className="sidebar-link">
            <HelpCircle className="inline-block w-4 h-4 mr-2" /> Manage Questions
          </Link>
          <Link href="/dashboard/modules" className="sidebar-link">
            <Image
              src="/icons/chatgpt.png" // Make sure this file is in /public/icons
              alt="ChatGPT"
              width={16}
              height={16}
              className="inline-block mr-2"
            />
            ChatGPT Modules
          </Link>
          <Link href="/dashboard/assignmodules" className="sidebar-link">
            <User className="inline-block w-4 h-4 mr-2" /> Assign Modules
          </Link>
          <Link href="/dashboard/generateadcode" className="sidebar-link">
            <Megaphone className="inline-block w-4 h-4 mr-2" /> Generate Ad Code
          </Link>
          <Link href="/dashboard/reports" className="sidebar-link">
            <PieChart className="inline-block w-4 h-4 mr-2" /> Reporting
          </Link>
        </nav>
      </div>
    </aside>
  );
}
