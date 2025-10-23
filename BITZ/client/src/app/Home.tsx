'use client';

import React from 'react';
import Link from 'next/link';

const Home: React.FC = () => {
  return (
    <main className="flex flex-col items-center justify-center h-3/4">
      <div className="text-left mb-32 p-6">
        <p className="text-gray-600 text-2xl">Use BITZ to take photos of species and learn about the biodiversity around you.</p>
        <div className="mt-4">
          <button className="text-orange-500 font-medium" onClick={() => window.location.href = '/about'}>
            LEARN MORE {">>>"}
          </button>
        </div>
      </div>
      
      <Link href="/quest" className="w-full">
        <div className="bg-[#3ec488] text-white p-6 w-full text-center hover:bg-[#2d9c68] transition-colors">
          <img src="text/start_quest.svg" alt="Start quest" className="w-[200px] h-auto mb-8 mx-auto" />
          <div className="flex justify-center">
            <img src="/icons/arrows_bicolor.svg" alt="Start Arrows" className="w-12 h-auto" />
          </div>
        </div>
      </Link>

      <div className="w-full mt-8 space-y-4 px-6">
        <Link href="/batch" className="block">
          <div className="bg-[#3ec488] text-white p-6 w-full text-center rounded-lg hover:bg-[#2d9c68] transition-colors">
            <h3 className="text-xl font-semibold mb-2">Batch Upload</h3>
            <p className="text-sm">Upload multiple photos at once for identification</p>
          </div>
        </Link>

{/* 
        <Link href="/identify-file" className="block">
          <div className="bg-[#3ec488] text-white p-6 w-full text-center rounded-lg hover:bg-[#2d9c68] transition-colors">
            <h3 className="text-xl font-semibold mb-2">Single</h3>
            <p className="text-sm">Choose a photo from your device to identify</p>
          </div>
        </Link>
*/}

      </div>
    </main>
  );
};

export default Home;