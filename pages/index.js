// pages/dashboard/index.js

import Layout from '@/components/Layout';

export default function Dashboard() {
  return (
    <Layout title="Dashboard">
      <div className="flex justify-center items-center h-[calc(100vh-100px)]">
        <h1 className="text-4xl font-bold text-center text-gray-800">
          Welcome to Matrix
        </h1>
      </div>
    </Layout>
  );
}
