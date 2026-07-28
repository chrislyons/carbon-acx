'use client'

import { useState } from 'react'

type VerificationState = 'idle' | 'verifying' | 'verified' | 'mismatch' | 'error'


export function VerifyArtifactButton({ artifactPath, expectedHash }: { artifactPath: string; expectedHash: string }) {
  const [state, setState] = useState<VerificationState>('idle')

  const verify = async () => {
    setState('verifying')
    try {
      const response = await fetch(`/artifacts/${artifactPath.replace(/^\/+/, '')}`, { cache: 'no-store' })
      if (!response.ok || !globalThis.crypto?.subtle) throw new Error('Artifact or browser crypto unavailable')
      const bytes = await response.arrayBuffer()
      const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes)
      const actualHash = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
      setState(actualHash === expectedHash.toLowerCase() ? 'verified' : 'mismatch')
    } catch {
      setState('error')
    }
  }

  const label = {
    idle: 'Verify downloaded bytes',
    verifying: 'Verifying…',
    verified: 'Verified',
    mismatch: 'Hash mismatch',
    error: 'Could not fetch artifact',
  }[state]

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" className="action-link" onClick={verify} disabled={state === 'verifying'}>
        {state === 'verified' || state === 'mismatch' || state === 'error' ? 'Verify again' : label}
      </button>
      <output aria-live="polite" className={state === 'mismatch' || state === 'error' ? 'text-sm text-[color:var(--error)]' : 'text-sm text-foreground-muted'}>
        {state === 'idle' || state === 'verifying' ? null : label}
      </output>
    </div>
  )
}
