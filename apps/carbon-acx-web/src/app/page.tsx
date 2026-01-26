'use client'

import Link from 'next/link'
import { useState } from 'react'
import { CATEGORY_INFO, formatEmissions } from '@/lib/calculator'

export default function HomePage() {
  return (
    <div className="min-h-full">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 25% 25%, #3b82f6 1px, transparent 1px),
                             radial-gradient(circle at 75% 75%, #10b981 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
          <h1 className="text-5xl sm:text-6xl font-bold mb-6 tracking-tight">
            Carbon ACX
          </h1>
          <p className="text-xl sm:text-2xl text-gray-300 mb-4 max-w-2xl mx-auto">
            Trustworthy Carbon Accounting
          </p>
          <p className="text-gray-400 mb-10 max-w-3xl mx-auto">
            Open reference stack with manifest-first architecture, byte hashes, and provenance tracking.
            Calculate, visualize, and verify your carbon footprint.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/calculator"
              className="px-8 py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-500 transition-colors shadow-lg shadow-blue-600/25"
            >
              Calculate Your Footprint
            </Link>
            <Link
              href="/explore/3d"
              className="px-8 py-4 bg-white/10 text-white rounded-xl font-semibold hover:bg-white/20 transition-colors backdrop-blur"
            >
              Explore in 3D
            </Link>
          </div>
        </div>
      </section>

      {/* Quick Stats */}
      <section className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-3xl font-bold text-gray-900">22</div>
              <div className="text-sm text-gray-500">Activities Tracked</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900">5</div>
              <div className="text-sm text-gray-500">Categories</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900">6</div>
              <div className="text-sm text-gray-500">Carbon Scenarios</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900">100%</div>
              <div className="text-sm text-gray-500">Open Source</div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Explore Carbon Data
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Calculator */}
            <Link
              href="/calculator"
              className="group bg-white rounded-2xl p-6 border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all"
            >
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
                🧮
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Calculator
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                Input your daily activities and get instant carbon footprint calculations with real emission factors.
              </p>
              <div className="flex flex-wrap gap-1">
                {Object.values(CATEGORY_INFO).slice(0, 3).map((cat) => (
                  <span key={cat.name} className="text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-600">
                    {cat.emoji} {cat.name}
                  </span>
                ))}
              </div>
            </Link>

            {/* 3D Universe */}
            <Link
              href="/explore/3d"
              className="group bg-white rounded-2xl p-6 border border-gray-200 hover:border-purple-300 hover:shadow-lg transition-all"
            >
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
                🌌
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                3D Universe
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                Immersive visualization where emission sources orbit as spheres. Click to fly, explore data in space.
              </p>
              <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                React Three Fiber
              </span>
            </Link>

            {/* Carbon Worlds */}
            <Link
              href="/explore/worlds"
              className="group bg-white rounded-2xl p-6 border border-gray-200 hover:border-green-300 hover:shadow-lg transition-all"
            >
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
                🌍
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Carbon Worlds
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                AI-generated 3D worlds visualizing carbon scenarios from current state to net zero.
              </p>
              <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                World Labs AI
              </span>
            </Link>

            {/* Manifests */}
            <Link
              href="/manifests"
              className="group bg-white rounded-2xl p-6 border border-gray-200 hover:border-amber-300 hover:shadow-lg transition-all"
            >
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
                📋
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Manifests
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                Verify data provenance with SHA256 hashes, timestamps, and complete audit trails.
              </p>
              <span className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded-full">
                Byte-level Verification
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* Calculator Categories Preview */}
      <section className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Track What Matters
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Our calculator covers the major sources of personal carbon emissions with verified emission factors.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {Object.entries(CATEGORY_INFO).map(([key, info]) => (
              <div
                key={key}
                className="bg-gray-50 rounded-xl p-6 text-center hover:bg-gray-100 transition-colors"
              >
                <div className="text-4xl mb-3">{info.emoji}</div>
                <div className="font-medium text-gray-900">{info.name}</div>
                <div
                  className="w-8 h-1 rounded-full mx-auto mt-2"
                  style={{ backgroundColor: info.color }}
                />
              </div>
            ))}
          </div>

          <div className="text-center mt-8">
            <Link
              href="/calculator"
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
            >
              Start calculating →
            </Link>
          </div>
        </div>
      </section>

      {/* Methodology Section */}
      <section className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">
                Transparent Methodology
              </h2>
              <p className="text-gray-300 mb-6">
                Every data point is backed by authoritative sources and can be independently verified.
                Our manifest-first architecture ensures complete data lineage.
              </p>
              <ul className="space-y-3 text-gray-300">
                <li className="flex items-center gap-3">
                  <span className="text-green-400">✓</span>
                  SHA256 hash verification
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-green-400">✓</span>
                  IPCC AR6 GWP100 emission factors
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-green-400">✓</span>
                  Reproducible Python pipelines
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-green-400">✓</span>
                  Open source and auditable
                </li>
              </ul>
              <div className="mt-8">
                <Link
                  href="/methodology"
                  className="text-blue-400 hover:text-blue-300 font-medium"
                >
                  Learn about our methodology →
                </Link>
              </div>
            </div>

            <div className="bg-gray-800 rounded-2xl p-6 font-mono text-sm">
              <div className="text-gray-400 mb-2">// Data Pipeline</div>
              <div className="text-green-400">CSV Inputs</div>
              <div className="text-gray-500 ml-4">↓</div>
              <div className="text-blue-400">Pydantic Validation</div>
              <div className="text-gray-500 ml-4">↓</div>
              <div className="text-purple-400">Derivation Engine</div>
              <div className="text-gray-500 ml-4">↓</div>
              <div className="text-amber-400">Figure Generation</div>
              <div className="text-gray-500 ml-4">↓</div>
              <div className="text-pink-400">Manifest Creation</div>
              <div className="text-gray-500 ml-4">↓</div>
              <div className="text-cyan-400">Hashed Artifacts</div>
              <div className="mt-4 text-gray-500 text-xs">
                dist/artifacts/&lt;sha256&gt;/
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-blue-600 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to understand your carbon footprint?
          </h2>
          <p className="text-blue-100 mb-8 max-w-2xl mx-auto">
            Start with our calculator, explore the 3D universe, or dive into the data manifests.
            All tools are free and open source.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/calculator"
              className="px-8 py-4 bg-white text-blue-600 rounded-xl font-semibold hover:bg-blue-50 transition-colors"
            >
              Get Started
            </Link>
            <a
              href="https://github.com/chrislyons/carbon-acx"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-400 transition-colors"
            >
              View on GitHub
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
