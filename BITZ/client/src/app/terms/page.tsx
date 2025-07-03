'use client';

import React from 'react';
import Header from '@/app/Header';
import Footer from '@/app/Footer';
import Link from 'next/link';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#f6f9ec] flex flex-col">
      {/* Background */}
      <div 
        className="fixed inset-0 -z-10"
        style={{
          backgroundImage: `url('/background/home.svg')`,
          backgroundColor: '#f6f9ec',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />
      
      {/* Header */}
      <Header menuColor="text-green-500" logoSrc="/logo/bitz_green.svg" />
      
      {/* Main Content - flex-grow  ensures it takes available space */}
      <main className="flex-grow  max-w-3xl mx-auto px-6 py-8 w-full">
        <h1 className="text-3xl mb-8">BITZ – Terms of Service</h1>
        <p className="text-sm text-gray-600 mb-8 italic">Last Updated: Apr 10, 2025</p>
        
        {/* Section 1 */}
        <section className="mb-8">
          <h2 className="text-orange-500 text-xl font-medium mb-4">1. Eligibility</h2>
          <p className="mb-4">
            By using the BITZ application ("Service"), you confirm that you are at least 18 years old. Use of the Service by individuals under the age of 18 is strictly prohibited.
          </p>
        </section>
        
        {/* Section 2 */}
        <section className="mb-8">
          <h2 className="text-orange-500 text-xl font-medium mb-4">2. Use of the Service</h2>
          <p className="mb-4">
            BITZ is a tool developed under the MUSAE/OAAK project to facilitate participatory biodiversity accounting through the collection and processing of user-submitted images.
          </p>
          <p className="mb-6">
            By using this Service, you agree and consent to the following:
          </p>
          
          <h3 className="text-orange-500 text-lg font-medium mb-3">2.1 Data Collection</h3>
          <ul className="mb-6 ml-4">
            <li className="mb-2">• <strong>Photographs you submit will be used to run the BITZ service.</strong></li>
            <li className="mb-2">• These images may be stored for processing and analysis purposes.</li>
          </ul>
          
          <h3 className="text-orange-500 text-lg font-medium mb-3">2.2 Data Usage and Publication</h3>
          <ul className="mb-6 ml-4">
            <li className="mb-2">• Submitted images will be <strong>added to a public dataset</strong> aimed at advancing ecological and technological research.</li>
            <li className="mb-2">• All data included in the dataset will be <strong>anonymized</strong>.</li>
            <li className="mb-2">• <strong>Images containing identifiable human subjects will be blurred</strong> before storage or publication.</li>
            <li className="mb-2">• <strong>Invalid or non-usable images will be discarded.</strong></li>
          </ul>
          
          <h3 className="text-orange-500 text-lg font-medium mb-3">2.3 Consent</h3>
          <p className="mb-2">By using the Service, you provide explicit consent for:</p>
          <ul className="mb-6 ml-4">
            <li className="mb-2">• The storage and processing of your submitted content.</li>
            <li className="mb-2">• The publication of anonymized content in public datasets.</li>
            <li className="mb-2">• The application of automated filters to ensure content compliance.</li>
          </ul>
        </section>
        
        {/* Section 3 */}
        <section className="mb-8">
          <h2 className="text-orange-500 text-xl font-medium mb-4">3. Data Management and Privacy</h2>
          <p className="mb-4">The data controller for this project is:</p>
          <div className="bg-white p-4 rounded-lg mb-4">
            <p className="font-medium">NICETRAILS S.L.</p>
            <p>08018 - Barcelona, Spain</p>
            <p>Contact: data@nicetrails.com</p>
          </div>
          <p className="mb-4">
            All data is handled in accordance with the <strong>General Data Protection Regulation (GDPR)</strong> and relevant <strong>EU privacy regulations</strong>.
          </p>
          <p className="mb-2">You may:</p>
          <ul className="mb-6 ml-4">
            <li className="mb-2">• Request access to your personal data.</li>
            <li className="mb-2">• Request the deletion of your submitted images (unless already anonymized and publicly shared).</li>
            <li className="mb-2">• Contact us at the email above for data access or deletion requests.</li>
          </ul>
        </section>
        
        {/* Section 4 */}
        <section className="mb-8">
          <h2 className="text-orange-500 text-xl font-medium mb-4">4. Acceptable Use</h2>
          <ul className="ml-4">
            <li className="mb-2">• You agree not to upload content that is offensive, unlawful, or violates the rights of others.</li>
            <li className="mb-2">• You agree not to attempt to manipulate or damage the system, models, or datasets.</li>
          </ul>
        </section>
        
        {/* Section 5 */}
        <section className="mb-8">
          <h2 className="text-orange-500 text-xl font-medium mb-4">5. Termination</h2>
          <p className="mb-4">
            We reserve the right to suspend or terminate access to BITZ if users breach these terms or misuse the platform.
          </p>
        </section>
        
        {/* Section 6 */}
        <section className="mb-8">
          <h2 className="text-orange-500 text-xl font-medium mb-4">6. Liability Disclaimer</h2>
          <p className="mb-4">
            The BITZ project is a research prototype. We make no warranties regarding availability, accuracy, or performance. Use is at your own risk.
          </p>
        </section>
        
        {/* Section 7 */}
        <section className="mb-8">
          <h2 className="text-orange-500 text-xl font-medium mb-4">7. Changes to the Terms</h2>
          <p className="mb-4">
            These Terms of Service may be updated periodically. Continued use of the Service constitutes acceptance of any updated terms.
          </p>
        </section>
        
        {/* Section 8 */}
        <section className="mb-16">
          <h2 className="text-orange-500 text-xl font-medium mb-4">8. Disclaimer</h2>
          <p className="mb-4 font-medium">BITZ makes mistakes.</p>
          <p className="mb-4">Do not consume any species based on information provided by BITZ.</p>
          <p className="mb-4">Do not take any medical advice provided by BITZ.</p>
          <p className="mb-4">Please explore your surroundings safely and use your best judgement.</p>
        </section>
      </main>
      
      {/* Footer */}
      <Footer />
    </div>
  );
}