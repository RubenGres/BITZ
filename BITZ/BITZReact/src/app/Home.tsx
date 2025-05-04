'use client';

import React from 'react';
import Link from 'next/link';

const Home: React.FC = () => {
  return (
    <main className="flex flex-col items-center justify-center h-3/4">
      <div className="text-left mb-32 p-6">
        <p className="text-gray-600 text-2xl">Use BITZ to take photos of species and learn about the biodiversity around you.</p>
        <div className="mt-4">
          <button className="text-orange-500 font-medium">
            LEARN MORE {">>>"}
          </button>
        </div>
      </div>
      
      <Link href="/quest" className="w-full">
        <div className="bg-[#3ec488] text-white p-6 w-full text-center">
          <img src="text/start_quest.svg" alt="Start quest" className="w-[200px] h-auto mb-8 mx-auto" />
          <div className="flex justify-center">
            <img src="/icons/arrows_bicolor.svg" alt="Start Arrows" className="w-12 h-auto" />
          </div>
        </div>
      </Link>
    </main>
  );
};

export default Home;