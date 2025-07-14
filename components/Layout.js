// components/Layout.js
import Head from 'next/head';
import Sidebar from './Sidebar';

export default function Layout({ children, title = 'Matrix Sampling' }) {
  return (
    <>
      <Head>
        <title>{title}</title>
      </Head>
      <div className="flex">
        <Sidebar />
        <main className="ml-64 p-8 w-full bg-gray-50 min-h-screen">
          {children}
        </main>
      </div>
    </>
  );
}
