import { useTranslation } from 'react-i18next';
import { useEphemeralStore } from '../../store';
import { FileText, ArrowLeft } from 'lucide-react';

export default function DecoyMode() {
  const { t } = useTranslation();
  const { toggleDecoyMode } = useEphemeralStore();

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-auto">
      {/* Header */}
      <header className="bg-rm-gray-100 border-b border-rm-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-rm-gray-600" />
            <h1 className="text-lg font-semibold text-rm-gray-800">
              Project Documentation
            </h1>
          </div>
          <button
            onClick={toggleDecoyMode}
            className="flex items-center gap-2 text-sm text-rm-gray-600 hover:text-rm-black"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Work
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="prose prose-gray max-w-none">
          <h2 className="text-2xl font-bold text-rm-gray-900 mb-4">
            Technical Documentation
          </h2>
          <p className="text-rm-gray-600 mb-6">
            This document outlines the system architecture and technical specifications
            for the current project implementation.
          </p>

          <section className="mb-8">
            <h3 className="text-xl font-semibold text-rm-gray-800 mb-3">
              1. Project Overview
            </h3>
            <p className="text-rm-gray-600 mb-3">
              A comprehensive web-based platform designed to provide accessible
              health information services to the Rwandan community. The system
              prioritizes user privacy and data security.
            </p>
          </section>

          <section className="mb-8">
            <h3 className="text-xl font-semibold text-rm-gray-800 mb-3">
              2. System Architecture
            </h3>
            <ul className="list-disc list-inside text-rm-gray-600 space-y-2">
              <li>Frontend: React 18 with TypeScript</li>
              <li>State Management: Zustand with persistence</li>
              <li>Styling: Tailwind CSS</li>
              <li>Routing: React Router v6</li>
              <li>Internationalization: i18next</li>
            </ul>
          </section>

          <section className="mb-8">
            <h3 className="text-xl font-semibold text-rm-gray-800 mb-3">
              3. Data Storage Strategy
            </h3>
            <ul className="list-disc list-inside text-rm-gray-600 space-y-2">
              <li>localStorage: Persistent data (max 5MB)</li>
              <li>sessionStorage: Session-only data</li>
              <li>Client-side encryption for sensitive data</li>
              <li>Compression for media assets</li>
            </ul>
          </section>

          <section className="mb-8">
            <h3 className="text-xl font-semibold text-rm-gray-800 mb-3">
              4. Key Features
            </h3>
            <ul className="list-disc list-inside text-rm-gray-600 space-y-2">
              <li>Multi-language support (4 languages)</li>
              <li>AI-powered content generation</li>
              <li>Location-based service finder</li>
              <li>Anonymous user system</li>
              <li>Accessibility compliance (WCAG 2.1 AA)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h3 className="text-xl font-semibold text-rm-gray-800 mb-3">
              5. Privacy & Security
            </h3>
            <ul className="list-disc list-inside text-rm-gray-600 space-y-2">
              <li>No personal data collection</li>
              <li>No tracking cookies</li>
              <li>Anonymous session management</li>
              <li>Client-side data only</li>
              <li>Decoy mode for user safety</li>
            </ul>
          </section>

          <div className="mt-12 pt-6 border-t border-rm-gray-200">
            <p className="text-sm text-rm-gray-500">
              Document Version: 1.0 | Last Updated: April 2026
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
